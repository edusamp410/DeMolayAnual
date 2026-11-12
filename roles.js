const STORAGE_KEY = 'ctr_demo_users_v2';
const SESSION_KEY = 'ctr_demo_session_v2';
const PRESENCE_KEY = 'ctr_presence_requests';
const CALENDAR_KEY = 'ctr_calendar_events';
const CEREMONIES_KEY = 'ctr_cerimonias_publicas';
const DEFAULT_PRESENCE_EVENT_ID = 'evt-geral';

function seedUsers() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return Array.isArray(saved) ? saved : [];
}

function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getSession() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!session) return null;

  const users = getUsers();
  const user = users.find(item => Number(item.id) === Number(session.id));
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  return user;
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    id: Number(user.id),
    nome: user.nome,
    papel: user.papel
  }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function login(id, password) {
  const users = seedUsers();
  const user = users.find(item => Number(item.id) === Number(id) && item.senha === password);

  if (!user) return null;

  setSession(user);
  return user;
}

function createInitialAdmin(id, name, password) {
  const users = getUsers();
  const normalizedId = Number(id);
  const normalizedName = String(name).trim();

  if (
    users.length > 0 ||
    !Number.isSafeInteger(normalizedId) ||
    normalizedId <= 0 ||
    !normalizedName ||
    String(password).length < 12
  ) {
    return null;
  }

  const user = {
    id: normalizedId,
    nome: normalizedName,
    senha: String(password),
    papel: 'administrador',
    criadoEm: new Date().toISOString()
  };

  saveUsers([user]);
  setSession(user);
  return user;
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

function requireAuth() {
  const user = getSession();

  if (!user) {
    window.location.href = 'login.html';
    return null;
  }

  return user;
}

function isAdmin(user) {
  return user && user.papel === 'administrador';
}

function getCurrentPageName() {
  const path = window.location.pathname.split('/').pop() || 'perfil.html';
  return path;
}

function updateUserRole(targetId, nextRole) {
  const users = getUsers();
  const userIndex = users.findIndex(item => Number(item.id) === Number(targetId));

  if (userIndex === -1) return false;

  users[userIndex].papel = nextRole;
  saveUsers(users);
  return true;
}

function getPresenceRequests() {
  return JSON.parse(localStorage.getItem(PRESENCE_KEY) || '[]');
}

function savePresenceRequests(requests) {
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(requests));
}

function getPresenceRequestsForMember(memberId) {
  return getPresenceRequests()
    .filter(request => Number(request.membroId) === Number(memberId))
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

function getEventDateTimeValue(event) {
  if (!event) return null;

  const rawDate = event.dataHora || event.data || event.date || event.dateTime || '';
  const rawTime = event.hora || event.time || '00:00';

  if (!rawDate) return null;

  const normalized = rawDate.includes('T') ? rawDate : `${rawDate}T${rawTime}`;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getNearestEventForRequest() {
  const events = getCalendarEvents();
  if (!events.length) return null;

  const now = new Date();
  const validEvents = events
    .map((event) => ({
      event,
      date: getEventDateTimeValue(event)
    }))
    .filter(item => item.date && !Number.isNaN(item.date.getTime()));

  if (!validEvents.length) return null;

  validEvents.sort((a, b) => {
    const distanceA = Math.abs(now.getTime() - a.date.getTime());
    const distanceB = Math.abs(now.getTime() - b.date.getTime());
    return distanceA - distanceB;
  });

  return validEvents[0].event;
}

function getEventById(eventId) {
  const resolvedEventId = eventId || DEFAULT_PRESENCE_EVENT_ID;
  return getCalendarEvents().find(item => item.id === resolvedEventId) || null;
}

function generatePresencePayload(member, eventId = null) {
  const resolvedEvent = eventId ? getEventById(eventId) : getNearestEventForRequest();
  const finalEventId = (resolvedEvent && resolvedEvent.id) || DEFAULT_PRESENCE_EVENT_ID;
  const eventDate = getEventDateTimeValue(resolvedEvent) || new Date('2026-11-20T19:00:00');

  return JSON.stringify({
    tipo: 'presenca',
    membroId: Number(member.id),
    nome: member.nome,
    eventoId: finalEventId,
    eventoTitulo: resolvedEvent ? resolvedEvent.titulo : 'Reunião Geral',
    eventoData: resolvedEvent ? (resolvedEvent.dataHora || resolvedEvent.data || '2026-11-20') : '2026-11-20',
    eventoHora: resolvedEvent ? (resolvedEvent.hora || '19:00') : '19:00',
    timestamp: new Date().toISOString(),
    dataSolicitada: eventDate.toISOString()
  });
}

function createPresenceRequest(memberId, memberName, eventId = null) {
  const requests = getPresenceRequests();
  const resolvedEvent = eventId ? getEventById(eventId) : getNearestEventForRequest();
  const finalEventId = (resolvedEvent && resolvedEvent.id) || DEFAULT_PRESENCE_EVENT_ID;
  const alreadyPending = requests.some((request) =>
    Number(request.membroId) === Number(memberId) &&
    String(request.eventId || DEFAULT_PRESENCE_EVENT_ID) === String(finalEventId) &&
    request.status === 'pendente'
  );

  if (alreadyPending) return null;

  const payload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    membroId: Number(memberId),
    nome: memberName,
    status: 'pendente',
    data: new Date().toISOString(),
    eventId: finalEventId,
    eventoTitulo: resolvedEvent ? resolvedEvent.titulo : 'Reunião Geral',
    eventoData: resolvedEvent ? (resolvedEvent.dataHora || resolvedEvent.data || '2026-11-20') : '2026-11-20',
    eventoHora: resolvedEvent ? (resolvedEvent.hora || '19:00') : '19:00',
    aprovadoPor: null,
    observacao: ''
  };

  requests.unshift(payload);
  savePresenceRequests(requests);
  return payload;
}

function updatePresenceRequestStatus(requestId, status, adminUser) {
  const requests = getPresenceRequests();
  const target = requests.find(item => item.id === requestId);

  if (!target) return false;

  target.status = status;
  target.aprovadoPor = adminUser ? adminUser.nome : null;
  target.dataAprovacao = new Date().toISOString();
  target.observacao = status === 'aprovada' ? 'Presença confirmada pelo administrador.' : 'Solicitação rejeitada.';

  savePresenceRequests(requests);
  return true;
}

function getPendingPresenceRequests() {
  return getPresenceRequests().filter(item => item.status === 'pendente');
}

function getPresenceSummaryForEvent(eventId) {
  const targetEventId = eventId || DEFAULT_PRESENCE_EVENT_ID;
  const users = getUsers();
  const requests = getPresenceRequests();
  const statusByUser = new Map();

  requests.forEach((request) => {
    const requestEventId = request.eventId || DEFAULT_PRESENCE_EVENT_ID;
    if (requestEventId !== targetEventId) return;

    const key = Number(request.membroId);
    const status = request.status === 'aprovada' ? 'presente' : 'ausente';
    statusByUser.set(key, status);
  });

  const presentes = [];
  const ausentes = [];

  users.forEach((user) => {
    const estado = statusByUser.get(Number(user.id));

    if (estado === 'presente') {
      presentes.push({
        id: Number(user.id),
        nome: user.nome,
        papel: user.papel
      });
      return;
    }

    const temSolicitacao = requests.some((request) => {
      const requestEventId = request.eventId || DEFAULT_PRESENCE_EVENT_ID;
      return Number(request.membroId) === Number(user.id) && requestEventId === targetEventId;
    });

    if (temSolicitacao) {
      ausentes.push({
        id: Number(user.id),
        nome: user.nome,
        papel: user.papel
      });
      return;
    }

    ausentes.push({
      id: Number(user.id),
      nome: user.nome,
      papel: user.papel
    });
  });

  return { presentes, ausentes };
}

function getCalendarEvents() {
  return JSON.parse(localStorage.getItem(CALENDAR_KEY) || '[]');
}

function saveCalendarEvents(events) {
  localStorage.setItem(CALENDAR_KEY, JSON.stringify(events));
}

function getCerimoniasPublicas() {
  return JSON.parse(localStorage.getItem(CEREMONIES_KEY) || '[]');
}

function saveCerimoniasPublicas(items) {
  localStorage.setItem(CEREMONIES_KEY, JSON.stringify(items));
}

function seedCalendarAndCeremonies() {
  const calendar = getCalendarEvents();
  const ceremonies = getCerimoniasPublicas();

  if (!calendar.length) {
    saveCalendarEvents([
      {
        id: DEFAULT_PRESENCE_EVENT_ID,
        titulo: 'Reunião Geral',
        data: '2026-11-20',
        hora: '19:00',
        dataHora: '2026-11-20T19:00',
        tipo: 'reuniao'
      }
    ]);
  }

  if (!ceremonies.length) {
    saveCerimoniasPublicas([
      {
        id: 'cer-1',
        titulo: 'Cerimônias públicas',
        descricao: 'Material oficial e avisos para a comunidade.',
        arquivo: '',
        data: new Date().toISOString()
      }
    ]);
  }
}

function addCalendarEvent(event) {
  const existing = getCalendarEvents();
  const normalizedEvent = {
    ...event,
    dataHora: event.dataHora || (event.data && event.hora ? `${event.data}T${event.hora}` : event.data),
    hora: event.hora || '19:00'
  };

  existing.unshift(normalizedEvent);
  saveCalendarEvents(existing);
}

function removeCalendarEvent(id) {
  const events = getCalendarEvents().filter(item => item.id !== id);
  saveCalendarEvents(events);
}

function addCerimoniaPublica(item) {
  const existing = getCerimoniasPublicas();
  existing.unshift(item);
  saveCerimoniasPublicas(existing);
}

function removeCerimoniaPublica(id) {
  const items = getCerimoniasPublicas().filter(item => item.id !== id);
  saveCerimoniasPublicas(items);
}
