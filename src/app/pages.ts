import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, AuthService, Client, Repair, Tracking, User } from './core';

const errorMessage = (error: any) => error?.status === 0 || error?.name === 'TimeoutError'
  ? 'No se pudo conectar con el servidor. Comprueba la conexión e inténtalo nuevamente.'
  : error?.error?.message || 'No se pudo completar la solicitud. Intenta nuevamente.';
const validationErrors = (error: any): Record<string, string> => error?.error?.errors || {};
const digitsOnly = (value: string) => (value || '').replace(/\D/g, '');
const personNamePattern = /^[\p{L}][\p{L}\p{M}]*(?: +[\p{L}][\p{L}\p{M}]*)*$/u;
const stages = [
  { code: 'RECEIVED', label: 'Recibido' },
  { code: 'DIAGNOSING', label: 'En diagnóstico' },
  { code: 'IN_REPAIR', label: 'En reparación' },
  { code: 'REPAIRED', label: 'Terminado' },
  { code: 'DELIVERED', label: 'Entregado' },
];

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="public-page">
      <section class="lookup-card">
        <span class="eyebrow">SEGUIMIENTO DE REPARACIONES</span>
        <h1>Consulta tu equipo</h1>
        <p>Ingresa el código que recibiste al dejar tu equipo.</p>
        <form #lookupForm="ngForm" novalidate (ngSubmit)="go(lookupForm)" class="lookup-form">
          <label for="tracking-code">Código de seguimiento</label>
          <div class="lookup-control">
            <input id="tracking-code" name="code" [(ngModel)]="code" (ngModelChange)="codeError = ''" #codeField="ngModel" placeholder="GT-AB12CD34" autocomplete="off" required>
            <button class="button button-primary" type="submit">Consultar</button>
          </div>
          <small class="field-error" *ngIf="codeField.invalid && codeField.touched">Ingresa un código de seguimiento.</small>
          <small class="field-error" *ngIf="codeError">{{ codeError }}</small>
        </form>
        <a class="staff-link" routerLink="/login">Acceso del personal</a>
      </section>
    </main>
  `,
})
export class HomePage {
  private router = inject(Router);
  code = '';
  codeError = '';
  go(form: NgForm) {
    form.control.markAllAsTouched();
    if (form.invalid) return;
    if (!this.code.trim()) { this.codeError = 'Ingresa un código de seguimiento.'; return; }
    this.router.navigate(['/seguimiento', this.code.trim().toUpperCase()]);
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="public-page tracking-page">
      <section class="tracking-content">
        <a routerLink="/" class="back-link">← Volver a consultar</a>
        <div class="page-title">
          <span class="eyebrow">SEGUIMIENTO DE REPARACIONES</span>
          <h1>Estado de tu equipo</h1>
        </div>
        <form #lookupForm="ngForm" novalidate class="lookup-inline" (ngSubmit)="search(lookupForm)">
          <label for="lookup-code">Código de seguimiento</label>
          <div class="lookup-control">
            <input id="lookup-code" name="code" [(ngModel)]="code" (ngModelChange)="codeError = ''; error = ''" #codeField="ngModel" placeholder="GT-AB12CD34" required>
            <button class="button button-primary" type="submit" [disabled]="loading()">{{ loading() ? 'Buscando…' : 'Consultar' }}</button>
          </div>
          <small class="field-error" *ngIf="codeField.invalid && codeField.touched">Ingresa un código de seguimiento.</small>
          <small class="field-error" *ngIf="codeError">{{ codeError }}</small>
          <p class="form-error" *ngIf="error">{{ error }}</p>
        </form>

        <article class="tracking-result" *ngIf="result">
          <div class="result-heading">
            <div><span class="eyebrow">ORDEN DE SERVICIO</span><h2>{{ result.trackingCode }}</h2></div>
            <span class="status-pill" [ngClass]="result.status.toLowerCase()">{{ result.statusLabel }}</span>
          </div>

          <div class="repair-progress" aria-label="Progreso de la reparación">
            <div class="progress-line"><span [style.width.%]="progressWidth"></span></div>
            <div class="progress-steps">
              <div class="progress-step" *ngFor="let stage of stages; let i = index" [class.done]="i <= currentStage" [class.current]="i === currentStage">
                <span class="step-marker">{{ i < currentStage ? '✓' : i + 1 }}</span>
                <span>{{ stage.label }}</span>
              </div>
            </div>
          </div>

          <dl class="repair-facts">
            <div><dt>Equipo</dt><dd>{{ result.brand }} {{ result.model }}</dd><small>{{ result.equipment }}</small></div>
            <div><dt>Recibido</dt><dd>{{ result.receivedAt | date:'d MMM y' }}</dd></div>
            <div><dt>Entrega estimada</dt><dd>{{ result.estimatedDelivery ? (result.estimatedDelivery | date:'d MMM y') : 'Por confirmar' }}</dd></div>
          </dl>

          <section class="customer-note" *ngIf="result.diagnosis || result.customerObservations">
            <div *ngIf="result.diagnosis"><h3>Diagnóstico</h3><p>{{ result.diagnosis }}</p></div>
            <div *ngIf="result.customerObservations"><h3>Observaciones</h3><p>{{ result.customerObservations }}</p></div>
          </section>

          <section class="history-section" *ngIf="result.history.length">
            <h3>Historial</h3>
            <ol class="history-list">
              <li *ngFor="let item of result.history">
                <span class="history-marker"></span>
                <div><b>{{ item.label }}</b><time>{{ item.createdAt | date:'d MMM y, h:mm a' }}</time>
                  <p *ngIf="item.observation">{{ item.observation }}</p>
                </div>
              </li>
            </ol>
          </section>
        </article>
      </section>
    </main>
  `,
})
export class TrackingPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  readonly stages = stages;
  code = '';
  error = '';
  codeError = '';
  loading = signal(false);
  result: Tracking | null = null;

  get currentStage() { return this.result ? Math.max(0, stages.findIndex(stage => stage.code === this.result!.status)) : 0; }
  get progressWidth() { return this.currentStage / (stages.length - 1) * 100; }

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code');
    if (code) { this.code = code; void this.search(); }
  }

  async search(form?: NgForm) {
    form?.control.markAllAsTouched();
    this.codeError = '';
    this.error = '';
    if (!this.code.trim()) { this.codeError = 'Ingresa un código de seguimiento.'; return; }
    this.result = null;
    this.loading.set(true);
    try { this.result = await this.api.get<Tracking>(`/seguimiento/${encodeURIComponent(this.code.trim())}`); }
    catch (error) { this.error = errorMessage(error); }
    finally { this.loading.set(false); }
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="login-page">
      <form #loginForm="ngForm" novalidate class="login-card" (ngSubmit)="submit(loginForm)">
        <div class="login-intro"><a routerLink="/" class="back-link">← Seguimiento público</a><span class="eyebrow">PERSONAL GALATECH</span></div>
        <h1>Iniciar sesión</h1>
        <p>Ingresa con tu cuenta de trabajo.</p>
        <label>Correo electrónico<input type="email" name="email" [(ngModel)]="email" (ngModelChange)="error = ''" #emailField="ngModel" autocomplete="username" required email><small class="field-error" *ngIf="emailField.invalid && emailField.touched">{{ emailField.errors?.['required'] ? 'Ingresa tu correo electrónico.' : 'Ingresa un correo electrónico válido.' }}</small></label>
        <label>Contraseña<input type="password" name="password" [(ngModel)]="password" (ngModelChange)="error = ''" #passwordField="ngModel" autocomplete="current-password" required><small class="field-error" *ngIf="passwordField.invalid && passwordField.touched">Ingresa tu contraseña.</small></label>
        <p class="form-error" *ngIf="error">{{ error }}</p>
        <button class="button button-primary login-submit" [disabled]="loading()">{{ loading() ? 'Ingresando…' : 'Ingresar' }}</button>
      </form>
    </main>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = '';
  password = '';
  error = '';
  loading = signal(false);
  async submit(form: NgForm) {
    form.control.markAllAsTouched();
    if (form.invalid) return;
    this.loading.set(true);
    this.error = '';
    try { await this.auth.login(this.email, this.password); this.router.navigateByUrl('/panel'); }
    catch (error) { this.error = errorMessage(error); }
    finally { this.loading.set(false); }
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="workspace">
      <aside class="side-nav">
        <span class="side-label">{{ isAdmin ? 'ADMINISTRACIÓN' : 'TRABAJO DIARIO' }}</span>
        <a routerLink="/panel" class="selected">Resumen</a>
        @if (isAdmin) { <a routerLink="/reparaciones">Reparaciones</a><a routerLink="/nueva-reparacion">Nueva reparación</a><a routerLink="/clientes">Clientes</a><a routerLink="/tecnicos">Técnicos</a> }
        @else { <a routerLink="/reparaciones">Reparaciones</a> }
      </aside>

      <section class="work-main">
        <header class="work-heading">
          <div><span class="eyebrow">{{ isAdmin ? 'RESUMEN DEL SISTEMA' : 'Bandeja de trabajo' }}</span><h1>{{ isAdmin ? 'Resumen' : 'Mis reparaciones' }}</h1></div>
          @if (isAdmin) { <a class="button button-primary" routerLink="/nueva-reparacion">Nueva reparación</a> }
        </header>
        <p class="form-error" *ngIf="error">{{ error }}</p>

        @if (loading()) {
          <p class="panel loading-state" role="status">Cargando información…</p>
        } @else if (!error && isAdmin) {
          <div class="summary-grid">
            <article class="summary-card"><span>Total registradas</span><b>{{ stats?.total ?? '—' }}</b></article>
            <article class="summary-card"><span>En curso</span><b>{{ stats?.inProgress ?? '—' }}</b></article>
            <article class="summary-card"><span>Terminadas</span><b>{{ stats?.completed ?? '—' }}</b></article>
            <article class="summary-card"><span>Entregadas</span><b>{{ stats?.delivered ?? '—' }}</b></article>
          </div>
          <section class="panel distribution-panel">
            <h2>Distribución por estado</h2>
            <div class="distribution-row" *ngFor="let row of distribution">
              <span>{{ row.label }}</span><div class="distribution-track"><i [style.width.%]="distributionWidth(row.count)"></i></div><b>{{ row.count }}</b>
            </div>
          </section>
          <section class="panel table-panel recent-activity">
            <div class="panel-heading"><div><h2>Actividad reciente</h2><p>Órdenes registradas recientemente</p></div><a routerLink="/reparaciones">Ver todas</a></div>
            <div class="table-wrap"><table><thead><tr><th>ORDEN</th><th>CLIENTE</th><th>EQUIPO</th><th>TÉCNICO</th><th>ESTADO</th><th>REGISTRO</th></tr></thead>
              <tbody><tr *ngFor="let row of stats?.recent"><td class="tracking-code">{{ row.trackingCode }}</td><td>{{ row.clientName }}</td><td>{{ row.equipmentBrand }} {{ row.equipmentModel }}</td><td>{{ row.technician || '—' }}</td><td><span class="status-pill" [ngClass]="row.status.toLowerCase()">{{ row.statusLabel }}</span></td><td>{{ row.createdAt | date:'d MMM y' }}</td></tr>
                <tr *ngIf="stats?.recent?.length === 0"><td colspan="6" class="empty-cell">Aún no hay reparaciones registradas. Al crear una orden aparecerá aquí.</td></tr></tbody>
            </table></div>
          </section>
        } @else if (!error) {
          <div class="summary-grid technician-summary">
            <article class="summary-card"><span>Reparaciones asignadas</span><b>{{ repairs.length }}</b></article>
            <article class="summary-card"><span>Por revisar</span><b>{{ countStatus('RECEIVED') }}</b></article>
            <article class="summary-card"><span>En curso</span><b>{{ countStatus('DIAGNOSING') + countStatus('IN_REPAIR') }}</b></article>
            <article class="summary-card"><span>Listas para entrega</span><b>{{ countStatus('REPAIRED') }}</b></article>
          </div>
          <section class="panel distribution-panel">
            <h2>Distribución de mis reparaciones</h2>
            <div class="distribution-row" *ngFor="let row of distribution">
              <span>{{ row.label }}</span><div class="distribution-track"><i [style.width.%]="distributionWidth(row.count)"></i></div><b>{{ row.count }}</b>
            </div>
          </section>
          <section class="panel table-panel recent-activity">
            <div class="panel-heading"><div><h2>Órdenes recientes</h2><p>Vista rápida de tus asignaciones</p></div><a routerLink="/reparaciones">Ver reparaciones</a></div>
            <div class="table-wrap"><table><thead><tr><th>ORDEN</th><th>CLIENTE</th><th>EQUIPO</th><th>ESTADO</th><th>REGISTRO</th><th></th></tr></thead>
              <tbody><tr *ngFor="let row of recentRepairs"><td class="tracking-code">{{ row.trackingCode }}</td><td>{{ row.clientName }}</td><td>{{ row.equipmentBrand }} {{ row.equipmentModel }}</td><td><span class="status-pill" [ngClass]="row.status.toLowerCase()">{{ row.statusLabel }}</span></td><td>{{ row.createdAt | date:'d MMM y' }}</td><td><a class="table-action" [routerLink]="['/reparaciones', row.trackingCode]">Abrir</a></td></tr>
              <tr *ngIf="recentRepairs.length === 0"><td colspan="6" class="empty-cell">No tienes reparaciones asignadas.</td></tr></tbody>
            </table></div>
          </section>
        }
      </section>
    </main>
  `,
})
export class DashboardPage {
  private api = inject(ApiService);
  auth = inject(AuthService);
  readonly stages = stages;
  stats: any = null;
  repairs: Repair[] = [];
  error = '';
  loading = signal(true);
  query = '';
  filter = '';
  get isAdmin() { return this.auth.user()?.role === 'ADMIN'; }
  get distribution() {
    if (!this.isAdmin) return stages.map(stage => ({ label: stage.label, count: this.countStatus(stage.code) }));
    return [
      { label: 'Recibido', count: this.stats?.received ?? 0 },
      { label: 'En diagnóstico o reparación', count: this.stats?.inProgress ?? 0 },
      { label: 'Reparación terminada', count: this.stats?.completed ?? 0 },
      { label: 'Entregado', count: this.stats?.delivered ?? 0 },
    ];
  }
  get filteredRepairs() {
    const q = this.query.trim().toLowerCase();
    return this.repairs.filter(row => (!this.filter || row.status === this.filter) && `${row.trackingCode} ${row.clientName} ${row.equipmentBrand} ${row.equipmentModel}`.toLowerCase().includes(q));
  }
  get recentRepairs() { return [...this.repairs].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,5); }
  countStatus(status: string) { return this.repairs.filter(repair => repair.status === status).length; }
  distributionWidth(count: number) { const total = this.isAdmin ? this.stats?.total : this.repairs.length; return total && count ? Math.max(3, count / total * 100) : 0; }
  async ngOnInit() {
    try {
      if (this.isAdmin) this.stats = await this.api.get<any>('/dashboard');
      else this.repairs = await this.api.get<Repair[]>('/reparaciones');
    } catch (error) { this.error = errorMessage(error); }
    finally { this.loading.set(false); }
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="workspace">
      <aside class="side-nav"><span class="side-label">{{ auth.user()?.role === 'ADMIN' ? 'ADMINISTRACIÓN' : 'TRABAJO DIARIO' }}</span><a routerLink="/panel">Resumen</a><a routerLink="/reparaciones" class="selected">Reparaciones</a>
        @if (auth.user()?.role === 'ADMIN') { <a routerLink="/nueva-reparacion">Nueva reparación</a><a routerLink="/clientes">Clientes</a><a routerLink="/tecnicos">Técnicos</a> }
      </aside>
      <section class="work-main">
        <header class="work-heading"><div><span class="eyebrow">ÓRDENES DE SERVICIO</span><h1>Reparaciones</h1></div>@if (auth.user()?.role === 'ADMIN') { <a class="button button-primary" routerLink="/nueva-reparacion">Nueva reparación</a> }</header>
        <p class="form-error" *ngIf="error">{{ error }}</p>
        <p class="panel loading-state" *ngIf="loading()" role="status">Cargando reparaciones…</p>
        <section class="panel table-panel" *ngIf="!loading()">
          <div class="queue-tools"><input aria-label="Buscar reparación" [(ngModel)]="query" placeholder="Buscar código, cliente o equipo"><select aria-label="Filtrar por estado" [(ngModel)]="filter"><option value="">Todos los estados</option><option *ngFor="let stage of stages" [value]="stage.code">{{ stage.label }}</option></select></div>
          <div class="table-wrap"><table><thead><tr><th>ORDEN</th><th>CLIENTE</th><th>EQUIPO</th><th>TÉCNICO</th><th>ESTADO</th><th>ENTREGA ESTIMADA</th><th></th></tr></thead>
            <tbody><tr *ngFor="let row of filtered"><td class="tracking-code">{{ row.trackingCode }}<small>{{ row.createdAt | date:'d MMM y' }}</small></td><td>{{ row.clientName }}<small>{{ row.clientPhone }}</small></td><td>{{ row.equipmentBrand }} {{ row.equipmentModel }}<small>{{ row.equipmentKind }}</small></td><td>{{ row.technician || '—' }}</td><td><span class="status-pill" [ngClass]="row.status.toLowerCase()">{{ row.statusLabel }}</span></td><td>{{ row.estimatedDelivery ? (row.estimatedDelivery | date:'d MMM y') : 'Por confirmar' }}</td><td><button class="table-action" (click)="select(row)">{{ auth.user()?.role === 'TECHNICIAN' ? 'Actualizar' : 'Detalle' }}</button></td></tr>
              <tr *ngIf="filtered.length === 0"><td colspan="7" class="empty-cell">{{ query || filter ? 'No hay reparaciones que coincidan con la búsqueda.' : 'No hay reparaciones registradas.' }}</td></tr></tbody>
          </table></div>
        </section>
        <section class="panel repair-detail" *ngIf="selected() && detailsReady()">
          <header class="panel-heading"><div><span class="eyebrow">{{ selected()!.trackingCode }}</span><h2>{{ selected()!.equipmentBrand }} {{ selected()!.equipmentModel }}</h2></div><button class="button button-secondary" (click)="selected.set(null); detailsReady.set(false)">Cerrar</button></header>
          <dl class="detail-facts"><div><dt>Cliente</dt><dd>{{ selected()!.clientName }}</dd><small>{{ selected()!.clientPhone }}</small></div><div><dt>Equipo</dt><dd>{{ selected()!.equipmentKind }} · {{ selected()!.equipmentBrand }} {{ selected()!.equipmentModel }}</dd><small>N.° de serie: {{ selected()!.serialNumber || 'No registrado' }}</small></div><div><dt>Problema reportado</dt><dd>{{ selected()!.problemReported || 'Sin detalle' }}</dd></div><div><dt>Diagnóstico</dt><dd>{{ selected()!.diagnosis || 'Pendiente' }}</dd></div></dl>
          <ol class="staff-history"><li *ngFor="let item of selected()!.history"><b>{{ item.label }}</b><span>{{ item.createdAt | date:'d MMM y, h:mm a' }} · {{ item.technician }}</span><p *ngIf="item.observation">{{ item.observation }}</p></li></ol>
          @if (auth.user()?.role === 'ADMIN') {
            <form #assignmentForm="ngForm" novalidate class="status-form" (ngSubmit)="assign(assignmentForm)"><label class="wide">Técnico asignado<select name="technicianId" [(ngModel)]="assignment.technicianId" #assignmentTechnician="ngModel" required><option value="">Selecciona un técnico</option><option *ngFor="let technician of technicians" [value]="technician.id">{{ technician.name }}</option></select><small class="field-error" *ngIf="fieldErrors['technicianId']">{{ fieldErrors['technicianId'] }}</small><small class="field-error" *ngIf="assignmentTechnician.invalid && assignmentTechnician.touched">Selecciona un técnico.</small></label><label>Fecha estimada<input type="date" name="assignmentDate" [(ngModel)]="assignment.estimatedDelivery"></label><button class="button button-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar asignación' }}</button></form>
          } @else {
            <form #statusForm="ngForm" novalidate class="status-form" (ngSubmit)="update(statusForm)"><label>Estado<select name="status" [(ngModel)]="edit.status" #statusField="ngModel" required><option value="">Selecciona un estado</option><option *ngFor="let stage of allowedStages" [value]="stage.code">{{ stage.label }}</option></select><small class="field-error" *ngIf="fieldErrors['status']">{{ fieldErrors['status'] }}</small><small class="field-error" *ngIf="statusField.invalid && statusField.touched">Selecciona un estado.</small></label><label>Diagnóstico<input name="diagnosis" [(ngModel)]="edit.diagnosis"></label><label>Fecha estimada<input type="date" name="estimatedDelivery" [(ngModel)]="edit.estimatedDelivery"></label><label>Observación para el cliente<input name="customerObservation" [(ngModel)]="edit.customerObservation"></label><label class="wide">Observación del cambio<input name="observation" [(ngModel)]="edit.observation"></label><button class="button button-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar actualización' }}</button></form>
          }
        </section>
      </section>
    </main>
  `,
})
export class RepairListPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);
  readonly stages = stages;
  items: Repair[] = [];
  query = '';
  filter = '';
  selected = signal<Repair | null>(null);
  edit: any = {};
  error = '';
  fieldErrors: Record<string, string> = {};
  saving = signal(false);
  loading = signal(true);
  detailsReady = signal(false);
  technicians: User[] = [];
  assignment: any = { technicianId: '', estimatedDelivery: '' };
  get filtered() {
    const q = this.query.trim().toLowerCase();
    return this.items.filter(row => (!this.filter || row.status === this.filter) && `${row.trackingCode} ${row.clientName} ${row.equipmentBrand} ${row.equipmentModel}`.toLowerCase().includes(q));
  }
  get allowedStages() {
    if (!this.selected) return this.stages;
    const current = this.stages.findIndex(stage => stage.code === this.selected()!.status);
    return this.stages.filter((_, index) => index === current || index === current + 1);
  }
  async ngOnInit() {
    try {
      const [items, technicians] = await Promise.all([
        this.api.get<Repair[]>('/reparaciones'),
        this.auth.user()?.role === 'ADMIN' ? this.api.get<User[]>('/usuarios') : Promise.resolve([] as User[]),
      ]);
      this.items = items;
      this.technicians = technicians.filter(user => user.active);
    } catch (error) { this.error = errorMessage(error); }
    finally { this.loading.set(false); }
    const code = this.route.snapshot.paramMap.get('code') || this.route.snapshot.queryParamMap.get('codigo');
    if (code) {
      const normalizedCode = code.trim().toUpperCase();
      const match = this.items.find(row => row.trackingCode.trim().toUpperCase() === normalizedCode);
      if (match) await this.select(match);
    }
  }
  async load() { this.loading.set(true); try { this.items = await this.api.get<Repair[]>('/reparaciones'); } catch (error) { this.error = errorMessage(error); } finally { this.loading.set(false); } }
  async select(row: Repair) {
    this.detailsReady.set(false);
    let selected: Repair;
    try { selected = await this.api.get<Repair>(`/reparaciones/${row.id}`); }
    catch (error) { this.error = errorMessage(error); selected = row; }
    this.selected.set(selected);
    this.edit = { status: selected.status, diagnosis: selected.diagnosis || '', customerObservation: selected.customerObservations || '', observation: '', estimatedDelivery: selected.estimatedDelivery || '' };
    this.assignment = { technicianId: selected.technicianId || '', estimatedDelivery: selected.estimatedDelivery || '' };
    this.detailsReady.set(true);
  }
  async assign(form: NgForm) {
    form.control.markAllAsTouched();
    if (form.invalid) return;
    if (!this.selected()) return;
    this.saving.set(true); this.error = '';
    try { await this.api.patch(`/reparaciones/${this.selected()!.id}/asignacion`, { ...this.assignment, estimatedDelivery: this.assignment.estimatedDelivery || null }); this.selected.set(null); await this.load(); }
    catch (error) { this.error = errorMessage(error); this.fieldErrors = validationErrors(error); }
    finally { this.saving.set(false); }
  }
  async update(form: NgForm) {
    form.control.markAllAsTouched();
    if (form.invalid) return;
    if (!this.selected()) return;
    this.saving.set(true);
    this.error = '';
    try { await this.api.patch(`/reparaciones/${this.selected()!.id}/estado`, { ...this.edit, estimatedDelivery: this.edit.estimatedDelivery || null }); this.selected.set(null); await this.load(); }
    catch (error) { this.error = errorMessage(error); this.fieldErrors = validationErrors(error); }
    finally { this.saving.set(false); }
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="workspace"><aside class="side-nav"><span class="side-label">ADMINISTRACIÓN</span><a routerLink="/panel">Resumen</a><a routerLink="/reparaciones">Reparaciones</a><a routerLink="/nueva-reparacion">Nueva reparación</a><a routerLink="/tecnicos" class="selected">Técnicos</a><a routerLink="/clientes">Clientes</a></aside>
      <section class="work-main"><header class="work-heading"><div><span class="eyebrow">CUENTAS DE ACCESO</span><h1>Técnicos</h1></div><button class="button button-primary" (click)="showForm = !showForm">Registrar técnico</button></header>
        <p class="form-error" *ngIf="error">{{ error }}</p>
        <p class="panel loading-state" *ngIf="loading()" role="status">Cargando técnicos…</p>
        <form #technicianForm="ngForm" novalidate class="panel form-panel" *ngIf="showForm" (ngSubmit)="save(technicianForm)"><h2>{{ editing ? 'Editar técnico' : 'Registrar técnico' }}</h2><div class="form-grid">
          <label>Nombre completo<input name="name" [(ngModel)]="form.name" (ngModelChange)="clearFieldError('name')" #nameField="ngModel" [pattern]="personNamePattern" required><small class="field-error" *ngIf="fieldErrors['name']">{{ fieldErrors['name'] }}</small><small class="field-error" *ngIf="nameField.invalid && nameField.touched">{{ nameField.errors?.['required'] ? 'Ingresa el nombre del técnico.' : 'Usa solo letras y espacios.' }}</small></label>
          <label>Correo electrónico<input type="email" name="email" [(ngModel)]="form.email" (ngModelChange)="clearFieldError('email')" #emailField="ngModel" email required><small class="field-error" *ngIf="fieldErrors['email']">{{ fieldErrors['email'] }}</small><small class="field-error" *ngIf="emailField.invalid && emailField.touched">{{ emailField.errors?.['required'] ? 'Ingresa el correo electrónico.' : 'Ingresa un correo electrónico válido.' }}</small></label>
          <label>Contraseña {{ editing ? '(opcional)' : '' }}<input type="password" name="password" [(ngModel)]="form.password" (ngModelChange)="clearFieldError('password')" #passwordField="ngModel" [required]="!editing" minlength="10"><small class="field-error" *ngIf="fieldErrors['password']">{{ fieldErrors['password'] }}</small><small class="field-error" *ngIf="passwordField.invalid && passwordField.touched">{{ passwordField.errors?.['required'] ? 'Ingresa una contraseña.' : 'Debe tener al menos 10 caracteres.' }}</small><small class="field-error" *ngIf="passwordField.touched && form.password && !form.password.trim()">La contraseña no puede contener solo espacios.</small></label>
        </div><div class="form-actions"><button type="button" class="button button-secondary" (click)="cancel()">Cancelar</button><button class="button button-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button></div></form>
        <section class="panel table-panel" *ngIf="!loading()"><div class="queue-tools"><input aria-label="Buscar técnico" [(ngModel)]="query" placeholder="Buscar por nombre o correo"></div><div class="table-wrap"><table><thead><tr><th>NOMBRE</th><th>CORREO</th><th>REGISTRO</th><th>ESTADO DE CUENTA</th><th>ACCIONES</th></tr></thead><tbody><tr *ngFor="let user of filtered"><td>{{ user.name }}</td><td>{{ user.email }}</td><td>{{ user.createdAt | date:'d MMM y' }}</td><td><span class="account-state">{{ user.active ? 'Activo' : 'Inactivo' }}</span></td><td><button class="table-action" (click)="editUser(user)">Editar</button><button class="table-action secondary-action" (click)="toggle(user)">{{ user.active ? 'Desactivar' : 'Activar' }}</button></td></tr><tr *ngIf="filtered.length === 0"><td colspan="5" class="empty-cell">{{ query ? 'No se encontraron técnicos con esa búsqueda.' : 'Aún no hay técnicos registrados.' }}</td></tr></tbody></table></div></section>
      </section>
    </main>
  `,
})
export class TechnicianPage {
  private api = inject(ApiService);
  items: User[] = [];
  query = '';
  showForm = false;
  editing: string | null = null;
  error = '';
  loading = signal(true);
  saving = signal(false);
  fieldErrors: Record<string, string> = {};
  personNamePattern = personNamePattern;
  form: any = { name: '', email: '', password: '' };
  get filtered() { const q = this.query.trim().toLowerCase(); return this.items.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(q)); }
  async ngOnInit() { await this.load(); }
  async load() { this.loading.set(true); try { this.items = await this.api.get<User[]>('/usuarios'); } catch (error) { this.error = errorMessage(error); } finally { this.loading.set(false); } }
  editUser(user: User) { this.editing = user.id; this.fieldErrors = {}; this.form = { name: user.name, email: user.email, password: '' }; this.showForm = true; }
  cancel() { this.showForm = false; this.editing = null; this.form = { name: '', email: '', password: '' }; }
  clearFieldError(field: string) { delete this.fieldErrors[field]; }
  async save(form: NgForm) {
    form.control.markAllAsTouched();
    if (form.invalid || (this.form.password && !this.form.password.trim())) return;
    this.saving.set(true); this.error = ''; this.fieldErrors = {};
    const payload = { ...this.form, name: this.form.name.trim().replace(/\s+/g, ' '), email: this.form.email.trim(), password: this.editing && !this.form.password?.trim() ? null : this.form.password };
    try { if (this.editing) await this.api.put(`/usuarios/${this.editing}`, payload); else await this.api.post('/usuarios', payload); this.cancel(); await this.load(); }
    catch (error) { this.error = errorMessage(error); this.fieldErrors = validationErrors(error); }
    finally { this.saving.set(false); }
  }
  async toggle(user: User) { try { await this.api.patch(`/usuarios/${user.id}/estado`, { active: !user.active }); await this.load(); } catch (error) { this.error = errorMessage(error); } }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="workspace"><aside class="side-nav"><span class="side-label">ADMINISTRACIÓN</span><a routerLink="/panel">Resumen</a><a routerLink="/reparaciones">Reparaciones</a><a routerLink="/nueva-reparacion">Nueva reparación</a><a routerLink="/clientes" class="selected">Clientes</a><a routerLink="/tecnicos">Técnicos</a></aside>
      <section class="work-main"><header class="work-heading"><div><span class="eyebrow">DIRECTORIO</span><h1>Clientes</h1></div><button class="button button-primary" (click)="showForm = !showForm">{{ showForm ? 'Cerrar formulario' : 'Registrar cliente' }}</button></header><p class="form-error" *ngIf="error">{{ error }}</p>
        <form #clientForm="ngForm" novalidate class="panel form-panel" *ngIf="showForm" (ngSubmit)="save(clientForm)"><h2>{{ editing ? 'Editar cliente' : 'Registrar cliente' }}</h2><div class="form-grid">
          <label>Nombres<input name="name" [(ngModel)]="form.name" (ngModelChange)="clearFieldError('name')" #nameField="ngModel" [pattern]="personNamePattern" required><small class="field-error" *ngIf="fieldErrors['name']">{{ fieldErrors['name'] }}</small><small class="field-error" *ngIf="nameField.invalid && nameField.touched">{{ nameField.errors?.['required'] ? 'Ingresa los nombres.' : 'Usa solo letras y espacios.' }}</small></label>
          <label>Apellidos<input name="lastName" [(ngModel)]="form.lastName" (ngModelChange)="clearFieldError('lastName')" #lastNameField="ngModel" [pattern]="personNamePattern" required><small class="field-error" *ngIf="fieldErrors['lastName']">{{ fieldErrors['lastName'] }}</small><small class="field-error" *ngIf="lastNameField.invalid && lastNameField.touched">{{ lastNameField.errors?.['required'] ? 'Ingresa los apellidos.' : 'Usa solo letras y espacios.' }}</small></label>
          <label>DNI<input type="text" inputmode="numeric" maxlength="8" pattern="^[0-9]{8}$" name="dni" [(ngModel)]="form.dni" (input)="filterDigits($event, 'dni', 8)" (ngModelChange)="clearFieldError('dni')" #dniField="ngModel"><small class="field-error" *ngIf="fieldErrors['dni']">{{ fieldErrors['dni'] }}</small><small class="field-error" *ngIf="dniField.invalid && dniField.touched">El DNI debe tener exactamente 8 dígitos.</small></label>
          <label>Teléfono<input type="text" inputmode="numeric" maxlength="9" pattern="^[0-9]{9}$" name="phone" [(ngModel)]="form.phone" (input)="filterDigits($event, 'phone', 9)" (ngModelChange)="clearFieldError('phone')" #phoneField="ngModel"><small class="field-error" *ngIf="fieldErrors['phone']">{{ fieldErrors['phone'] }}</small><small class="field-error" *ngIf="phoneField.invalid && phoneField.touched">El teléfono debe tener exactamente 9 dígitos.</small></label>
          <label>Correo electrónico<input type="email" email name="email" [(ngModel)]="form.email" (ngModelChange)="clearFieldError('email')" #emailField="ngModel"><small class="field-error" *ngIf="fieldErrors['email']">{{ fieldErrors['email'] }}</small><small class="field-error" *ngIf="emailField.invalid && emailField.touched">Ingresa un correo electrónico válido.</small></label>
        </div><div class="form-actions"><button type="button" class="button button-secondary" (click)="cancel()">Cancelar</button><button class="button button-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Guardar cliente') }}</button></div></form>
        <p class="panel loading-state" *ngIf="loading()" role="status">Cargando clientes…</p>
        <section class="panel table-panel" *ngIf="!loading()"><div class="queue-tools"><input aria-label="Buscar cliente" [(ngModel)]="query" placeholder="Buscar por nombre, DNI o teléfono"></div><div class="table-wrap"><table><thead><tr><th>NOMBRE</th><th>DNI</th><th>TELÉFONO</th><th>CORREO</th><th>ACCIONES</th></tr></thead><tbody><tr *ngFor="let client of filtered"><td>{{ client.name }} {{ client.lastName }}</td><td>{{ client.dni || '—' }}</td><td>{{ client.phone || '—' }}</td><td>{{ client.email || '—' }}</td><td><button class="table-action" (click)="editClient(client)">Editar</button></td></tr><tr *ngIf="filtered.length === 0"><td colspan="5" class="empty-cell">{{ query ? 'No se encontraron clientes con esa búsqueda.' : 'Aún no hay clientes registrados.' }}</td></tr></tbody></table></div></section>
      </section>
    </main>
  `,
})
export class ClientPage {
  api = inject(ApiService);
  items: Client[] = [];
  query = '';
  error = '';
  loading = signal(true);
  saving = signal(false);
  showForm = false;
  editing: string | null = null;
  form: any = { name: '', lastName: '', dni: '', phone: '', email: '' };
  fieldErrors: Record<string, string> = {};
  personNamePattern = personNamePattern;
  digitsOnly = digitsOnly;
  get filtered() { const q = this.query.trim().toLowerCase(); return this.items.filter(client => `${client.name} ${client.lastName} ${client.dni} ${client.phone}`.toLowerCase().includes(q)); }
  async ngOnInit() { await this.load(); }
  async load() { this.loading.set(true); try { this.items = await this.api.get<Client[]>('/clientes'); } catch (error) { this.error = errorMessage(error); } finally { this.loading.set(false); } }
  editClient(client: Client) { this.editing = client.id; this.form = { name: client.name, lastName: client.lastName, dni: client.dni || '', phone: client.phone || '', email: client.email || '' }; this.showForm = true; }
  cancel() { this.showForm = false; this.editing = null; this.fieldErrors = {}; this.form = { name: '', lastName: '', dni: '', phone: '', email: '' }; }
  clearFieldError(field: string) { delete this.fieldErrors[field]; }
  filterDigits(event: Event, field: 'dni' | 'phone', maxLength: number) {
    const input = event.target as HTMLInputElement;
    const filtered = digitsOnly(input.value).slice(0, maxLength);
    if (input.value !== filtered) input.value = filtered;
    this.form[field] = filtered;
    this.clearFieldError(field);
  }
  async save(form: NgForm) {
    form.control.markAllAsTouched();
    if (form.invalid) return;
    this.saving.set(true); this.error = ''; this.fieldErrors = {};
    const payload = { ...this.form, name: this.form.name.trim().replace(/\s+/g, ' '), lastName: this.form.lastName.trim().replace(/\s+/g, ' '), dni: digitsOnly(this.form.dni) || null, phone: digitsOnly(this.form.phone) || null, email: this.form.email.trim() || null };
    try { if (this.editing) await this.api.put(`/clientes/${this.editing}`, payload); else await this.api.post('/clientes', payload); this.cancel(); await this.load(); }
    catch (error) { this.error = errorMessage(error); this.fieldErrors = validationErrors(error); }
    finally { this.saving.set(false); }
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="workspace"><aside class="side-nav"><span class="side-label">ADMINISTRACIÓN</span><a routerLink="/panel">Resumen</a><a routerLink="/reparaciones">Reparaciones</a><a routerLink="/nueva-reparacion" class="selected">Nueva reparación</a><a routerLink="/clientes">Clientes</a><a routerLink="/tecnicos">Técnicos</a></aside>
      <section class="work-main"><header class="work-heading"><div><span class="eyebrow">ORDEN DE SERVICIO</span><h1>Nueva reparación</h1></div></header>
        <p class="success-message" *ngIf="success">{{ success }}</p><p class="form-error" *ngIf="error">{{ error }}</p>
        <p class="panel loading-state" *ngIf="!loaded()" role="status">Cargando clientes y técnicos…</p>
        <p class="form-error" *ngIf="loaded() && !clients.length">Registra un cliente antes de crear una reparación.</p>
        <p class="form-error" *ngIf="loaded() && !technicians.length">No hay técnicos activos para asignar reparaciones.</p>
        <form #repairForm="ngForm" novalidate class="panel form-panel" *ngIf="loaded()" (ngSubmit)="save(repairForm)"><h2>Equipo, cliente y asignación</h2><div class="form-grid">
          <label>Cliente<select name="clientId" [(ngModel)]="form.clientId" #clientField="ngModel" required><option value="">Selecciona un cliente</option><option *ngFor="let client of clients" [value]="client.id">{{ client.name }} {{ client.lastName }}</option></select><small class="field-error" *ngIf="fieldErrors['clientId']">{{ fieldErrors['clientId'] }}</small><small class="field-error" *ngIf="clientField.invalid && clientField.touched">Selecciona un cliente.</small></label>
          <label>Técnico asignado<select name="technicianId" [(ngModel)]="form.technicianId" #technicianField="ngModel" required><option value="">Selecciona un técnico</option><option *ngFor="let technician of technicians" [value]="technician.id">{{ technician.name }}</option></select><small class="field-error" *ngIf="fieldErrors['technicianId']">{{ fieldErrors['technicianId'] }}</small><small class="field-error" *ngIf="technicianField.invalid && technicianField.touched">Selecciona un técnico.</small></label>
          <label>Tipo de equipo<select name="kind" [(ngModel)]="form.kind" #kindField="ngModel" required><option value="">Selecciona un tipo</option><option>Laptop</option><option>Computadora de escritorio</option><option>Celular</option><option>Tablet</option><option>Impresora</option><option>Otro</option></select><small class="field-error" *ngIf="kindField.invalid && kindField.touched">Selecciona el tipo de equipo.</small></label>
          <label>Marca<input name="brand" [(ngModel)]="form.brand" #brandField="ngModel" required pattern=".*\S.*"><small class="field-error" *ngIf="fieldErrors['equipmentBrand']">{{ fieldErrors['equipmentBrand'] }}</small><small class="field-error" *ngIf="brandField.invalid && brandField.touched">Ingresa una marca válida.</small></label>
          <label>Modelo<input name="model" [(ngModel)]="form.model"></label><label>Número de serie<input name="serialNumber" [(ngModel)]="form.serialNumber"></label><label>Entrega estimada<input type="date" name="estimatedDelivery" [(ngModel)]="form.estimatedDelivery"></label><label class="wide">Descripción del equipo<input name="description" [(ngModel)]="form.description"></label>
          <label class="wide">Problema reportado<textarea name="problemReported" [(ngModel)]="form.problemReported" #problemField="ngModel" required pattern=".*\S.*" rows="3"></textarea><small class="field-error" *ngIf="fieldErrors['problemReported']">{{ fieldErrors['problemReported'] }}</small><small class="field-error" *ngIf="problemField.invalid && problemField.touched">Describe el problema reportado.</small></label>
          <label class="wide">Observación visible para el cliente<textarea name="customerObservations" [(ngModel)]="form.customerObservations" rows="2"></textarea></label></div>
          <div class="form-actions"><a class="button button-secondary" routerLink="/clientes">Registrar cliente</a><button class="button button-primary" [disabled]="saving() || !clients.length || !technicians.length">{{ saving() ? 'Creando…' : 'Crear y asignar reparación' }}</button></div>
        </form>
      </section>
    </main>
  `,
})
export class NewRepairPage {
  api = inject(ApiService);
  clients: Client[] = [];
  technicians: User[] = [];
  loaded = signal(false);
  error = '';
  success = '';
  saving = signal(false);
  fieldErrors: Record<string, string> = {};
  form: any = { clientId: '', technicianId: '', kind: 'Laptop', brand: '', model: '', serialNumber: '', description: '', problemReported: '', customerObservations: '', estimatedDelivery: '' };
  async ngOnInit() { try { [this.clients, this.technicians] = await Promise.all([this.api.get<Client[]>('/clientes'), this.api.get<User[]>('/usuarios')]); this.technicians = this.technicians.filter(user => user.active); } catch (error) { this.error = errorMessage(error); } finally { this.loaded.set(true); } }
  async save(form: NgForm) {
    form.control.markAllAsTouched();
    if (form.invalid) return;
    this.error = '';
    this.success = '';
    this.fieldErrors = {};
    this.saving.set(true);
    try {
      const repair = await this.api.post<Repair>('/reparaciones', { clientId: this.form.clientId, technicianId: this.form.technicianId, equipmentKind: this.form.kind, equipmentBrand: this.form.brand.trim(), equipmentModel: this.form.model.trim() || null, equipmentSerialNumber: this.form.serialNumber.trim() || null, equipmentDescription: this.form.description.trim() || null, problemReported: this.form.problemReported.trim(), customerObservations: this.form.customerObservations.trim() || null, estimatedDelivery: this.form.estimatedDelivery || null });
      this.success = `Reparación creada. Código de seguimiento: ${repair.trackingCode}`;
      this.form = { clientId: '', technicianId: '', kind: 'Laptop', brand: '', model: '', serialNumber: '', description: '', problemReported: '', customerObservations: '', estimatedDelivery: '' };
      form.resetForm(this.form);
    } catch (error) { this.error = errorMessage(error); this.fieldErrors = validationErrors(error); }
    finally { this.saving.set(false); }
  }
}
