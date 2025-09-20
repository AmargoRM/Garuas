const body = document.body;
const page = document.getElementById('page');
const restricted = document.getElementById('restricted');
const requiredToken = body?.dataset?.accessToken || '';
const providedToken = new URLSearchParams(window.location.search).get('t');

function showRestricted() {
  if (restricted) {
    restricted.classList.remove('hidden');
  }
  if (page) {
    page.classList.add('hidden');
  }
}

if (requiredToken && requiredToken !== providedToken) {
  showRestricted();
  console.warn('Token inválido o ausente. Acceso restringido.');
  throw new Error('Acceso restringido: token inválido.');
}

if (page) {
  page.classList.remove('hidden');
}
if (restricted) {
  restricted.classList.add('hidden');
}

document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('preEvalForm');
const confirmation = document.getElementById('confirmation');
const confirmationMessage = document.getElementById('confirmation-message');
const backButton = document.getElementById('backButton');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const messageBox = document.getElementById('formMessage');
const latInput = document.getElementById('lat');
const lngInput = document.getElementById('lng');

const state = {
  respuestas: {},
};

const baseQuestions = ['q1', 'q2', 'q3', 'q5', 'q6', 'q7', 'q8'];

const followUpsConfig = {
  q1: {
    key: 'q1b',
    container: document.querySelector('[data-follow-up="q1"]'),
    showWhen: (value) => value === 'no',
  },
  q2: {
    key: 'q2b',
    container: document.querySelector('[data-follow-up="q2"]'),
    showWhen: (value) => value === 'no',
  },
  q5: {
    key: 'q5b',
    container: document.querySelector('[data-follow-up="q5"]'),
    showWhen: (value) => value === 'si',
  },
  q6: {
    key: 'q6b',
    container: document.querySelector('[data-follow-up="q6"]'),
    showWhen: (value) => value === 'no',
  },
  q6b: {
    key: 'q6c',
    container: document.querySelector('[data-follow-up="q6b"]'),
    showWhen: (value) => value === 'no',
  },
  q7: {
    key: 'q7b',
    container: document.querySelector('[data-alert="q7"]'),
    showWhen: (value) => value === 'si',
  },
};

const alertBoxes = {
  q3: document.querySelector('[data-alert="q3"]'),
  q6: document.querySelector('[data-alert="q6"]'),
};

let map;
let marker;

document.querySelectorAll('.option-btn').forEach((button) => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    handleResponse(button.dataset.question, button.dataset.value);
  });
});

Object.values(followUpsConfig).forEach((config) => {
  if (config?.container) {
    config.container.setAttribute('aria-hidden', 'true');
  }
});

Object.values(alertBoxes).forEach((box) => {
  box?.classList.add('hidden');
  box?.setAttribute('aria-hidden', 'true');
});

function resetQuestion(key) {
  if (!key) return;
  delete state.respuestas[key];
  const buttons = document.querySelectorAll(`.option-btn[data-question="${key}"]`);
  buttons.forEach((btn) => {
    btn.setAttribute('aria-pressed', 'false');
  });
}

function toggleContainer(container, show) {
  if (!container) return;
  container.classList.toggle('hidden', !show);
  container.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function getActiveQuestions() {
  const active = [...baseQuestions];
  if (state.respuestas.q1 === 'no') active.push('q1b');
  if (state.respuestas.q2 === 'no') active.push('q2b');
  if (state.respuestas.q5 === 'si') active.push('q5b');
  if (state.respuestas.q6 === 'no') {
    active.push('q6b');
    if (state.respuestas.q6b === 'no') {
      active.push('q6c');
    }
  }
  if (state.respuestas.q7 === 'si') active.push('q7b');
  return active;
}

function updateProgress() {
  const active = getActiveQuestions();
  const answered = active.filter((key) => Boolean(state.respuestas[key])).length;
  const progress = active.length ? Math.round((answered / active.length) * 100) : 0;
  progressBar.style.width = `${progress}%`;
  progressLabel.textContent = `${progress}%`;
}

function evaluateEstado() {
  const motivos = [];
  let requiereRevision = false;

  if (state.respuestas.q1 === 'no' && state.respuestas.q1b !== 'si') {
    requiereRevision = true;
    motivos.push('Se requiere poder notarial vigente del propietario.');
  }

  if (state.respuestas.q2 === 'no' && state.respuestas.q2b !== 'si') {
    requiereRevision = true;
    motivos.push('Es necesario completar la inscripción registral o información posesoria.');
  }

  if (state.respuestas.q3 === 'no') {
    requiereRevision = true;
    motivos.push('Debe regularizar obligaciones con Hacienda, CCSS y la Dirección de Aguas.');
  }

  if (state.respuestas.q5 === 'si' && state.respuestas.q5b !== 'si') {
    requiereRevision = true;
    motivos.push('Cuando la fuente está en Parque Nacional, la propiedad solicitante debe estar dentro del área.');
  }

  if (state.respuestas.q6 === 'no') {
    if (state.respuestas.q6b !== 'si') {
      if (state.respuestas.q6c !== 'si') {
        requiereRevision = true;
        motivos.push('Requiere servidumbre forzosa o acuerdo privado para conducir el agua.');
      }
    }
  }

  if (state.respuestas.q7 === 'si' && state.respuestas.q7b !== 'si') {
    requiereRevision = true;
    motivos.push('El uso para consumo humano requiere un proveedor estatal autorizado.');
  }

  if (state.respuestas.q8 === 'no') {
    requiereRevision = true;
    motivos.push('El aprovechamiento está dentro de un área de protección.');
  }

  const baseAnswered = baseQuestions.every((key) => Boolean(state.respuestas[key]));
  const admisiblePreliminar = !requiereRevision && baseAnswered && state.respuestas.q8 === 'si';

  return { requiereRevision, motivos, admisiblePreliminar };
}

function showMessage(text) {
  if (!messageBox) return;
  if (!text) {
    messageBox.classList.add('hidden');
    messageBox.textContent = '';
    return;
  }
  messageBox.textContent = text;
  messageBox.classList.remove('hidden');
}

function handleResponse(question, value) {
  state.respuestas[question] = value;
  const groupButtons = document.querySelectorAll(`.option-btn[data-question="${question}"]`);
  groupButtons.forEach((btn) => {
    const isActive = btn.dataset.value === value;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  if (followUpsConfig[question]) {
    const { key, container, showWhen } = followUpsConfig[question];
    const shouldShow = showWhen ? showWhen(value) : false;
    toggleContainer(container, shouldShow);
    if (!shouldShow) {
      resetQuestion(key);
      if (question === 'q6') resetQuestion('q6c');
    }
  }

  if (question === 'q6b' && value !== 'no') {
    const nested = followUpsConfig.q6b?.container;
    toggleContainer(nested, false);
    resetQuestion('q6c');
  }

  if (question === 'q7' && value !== 'si') {
    resetQuestion('q7b');
  }

  if (alertBoxes.q3) {
    const showQ3 = state.respuestas.q3 === 'no';
    alertBoxes.q3.classList.toggle('hidden', !showQ3);
    alertBoxes.q3.setAttribute('aria-hidden', showQ3 ? 'false' : 'true');
  }

  const showQ6 =
    state.respuestas.q6 === 'no' && state.respuestas.q6b === 'no' && state.respuestas.q6c === 'no';
  if (alertBoxes.q6) {
    alertBoxes.q6.classList.toggle('hidden', !showQ6);
    alertBoxes.q6.setAttribute('aria-hidden', showQ6 ? 'false' : 'true');
  }

  updateProgress();
  showMessage('');
}

function getPayload() {
  const estado = evaluateEstado();
  return {
    nombre: form.nombre.value.trim(),
    correo: form.correo.value.trim(),
    telefono: form.telefono.value.trim(),
    lat: latInput.value.trim(),
    lng: lngInput.value.trim(),
    respuestas: {
      q1: state.respuestas.q1 || null,
      q1b: state.respuestas.q1b || null,
      q2: state.respuestas.q2 || null,
      q2b: state.respuestas.q2b || null,
      q3: state.respuestas.q3 || null,
      q5: state.respuestas.q5 || null,
      q5b: state.respuestas.q5b || null,
      q6: state.respuestas.q6 || null,
      q6b: state.respuestas.q6b || null,
      q6c: state.respuestas.q6c || null,
      q7: state.respuestas.q7 || null,
      q7b: state.respuestas.q7b || null,
      q8: state.respuestas.q8 || null,
    },
    estado: {
      admisiblePreliminar: estado.admisiblePreliminar,
      requiereRevision: estado.requiereRevision,
      motivos: estado.motivos,
    },
    userAgent: navigator.userAgent,
    timestampISO: new Date().toISOString(),
  };
}

async function sendPayload(payload) {
  const endpoint = '/api/pre-evaluacion';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }
    console.info('Payload enviado a webhook', payload);
    return true;
  } catch (error) {
    console.warn('No se pudo enviar al webhook, usando mailto fallback.', error);
    const resumen = encodeURIComponent(
      `Nombre: ${payload.nombre}\nCorreo: ${payload.correo}\nTeléfono: ${payload.telefono}\nLat/Lng: ${payload.lat}, ${payload.lng}\nRespuestas: ${JSON.stringify(payload.respuestas, null, 2)}\nEstado: ${JSON.stringify(payload.estado, null, 2)}\nUser-Agent: ${payload.userAgent}\nTimestamp: ${payload.timestampISO}`
    );
    window.location.href = `mailto:info@garuas.com?subject=${encodeURIComponent('Pre-evaluación concesión (staging)')}&body=${resumen}`;
    return false;
  }
}

function renderConfirmation(estado) {
  if (!confirmation || !confirmationMessage) return;
  const mensaje = estado.admisiblePreliminar
    ? 'Su solicitud es admisible preliminarmente. En menos de 24 horas recibirá confirmación y la cotización.'
    : '¡Gracias! En menos de 24 horas le contactaremos para confirmar viabilidad y enviar la cotización. En algunos casos se requiere visita técnica y/o valoración de viabilidad ambiental.';
  confirmationMessage.textContent = mensaje;
  confirmation.classList.remove('hidden');
  form.classList.add('hidden');
}

function resetForm() {
  form.reset();
  state.respuestas = {};
  Object.keys(followUpsConfig).forEach((question) => {
    if (followUpsConfig[question]?.container) {
      toggleContainer(followUpsConfig[question].container, false);
    }
  });
  Object.values(alertBoxes).forEach((box) => box?.classList.add('hidden'));
  document.querySelectorAll('.option-btn').forEach((btn) => btn.setAttribute('aria-pressed', 'false'));
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  latInput.value = '';
  lngInput.value = '';
  confirmation.classList.add('hidden');
  form.classList.remove('hidden');
  form.empresa.value = '';
  updateProgress();
  showMessage('');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('');

  if (form.empresa.value.trim() !== '') {
    console.warn('Honeypot activado.');
    return;
  }

  if (!form.reportValidity()) {
    return;
  }

  const active = getActiveQuestions();
  const missing = active.filter((key) => !state.respuestas[key]);
  if (missing.length) {
    showMessage('Complete todas las preguntas requeridas para continuar.');
    return;
  }

  if (!latInput.value || !lngInput.value) {
    showMessage('Marque el punto en el mapa para continuar.');
    return;
  }

  const payload = getPayload();
  const estado = payload.estado;
  await sendPayload(payload);
  renderConfirmation(estado);
});

backButton.addEventListener('click', () => {
  resetForm();
});

function initMap() {
  if (!window.L) {
    setTimeout(initMap, 200);
    return;
  }
  map = L.map('map', { scrollWheelZoom: true, tap: false }).setView([9.936, -84.09], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> colaboradores',
  }).addTo(map);

  map.on('click', (event) => {
    const { lat, lng } = event.latlng;
    if (!marker) {
      marker = L.marker([lat, lng]).addTo(map);
    } else {
      marker.setLatLng([lat, lng]);
    }
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
    latInput.dispatchEvent(new Event('change'));
    lngInput.dispatchEvent(new Event('change'));
  });
}

window.addEventListener('load', () => {
  initMap();
  updateProgress();
});

showMessage('');
