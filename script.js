const STORAGE_KEY = "bekal10_participants";

const SCALE_OPTIONS = [
  { label: "Sangat tidak setuju", value: 0 },
  { label: "Tidak setuju", value: 1 },
  { label: "Agak setuju", value: 2 },
  { label: "Setuju", value: 3 },
  { label: "Sangat setuju", value: 4 },
];

const RIASEC_TRAITS = {
  realistic: "Realistic",
  investigative: "Investigative",
  artistic: "Artistic",
  social: "Social",
  enterprising: "Enterprising",
  conventional: "Conventional",
};

const VARK_TRAITS = {
  visual: "Visual",
  auditory: "Auditori",
  readwrite: "Baca/Tulis",
  kinesthetic: "Kinestetik",
};

const RIASEC_QUESTIONS = [
  { id: 1, trait: "realistic", text: "Saya suka mengotak-atik mobil" },
  { id: 2, trait: "investigative", text: "Saya suka bermain puzzle" },
  { id: 3, trait: "artistic", text: "Saya suka bekerja sendiri" },
  { id: 4, trait: "social", text: "Saya suka bekerja dalam tim" },
  { id: 5, trait: "enterprising", text: "Saya adalah orang yang ambisius" },
  { id: 6, trait: "conventional", text: "Saya suka menyusun dan mengatur barang-barang" },
  { id: 7, trait: "realistic", text: "Saya suka membangun sesuatu" },
  { id: 8, trait: "artistic", text: "Saya suka membaca tentang seni dan musik" },
  { id: 9, trait: "conventional", text: "Saya lebih suka memiliki instruksi yang jelas untuk diikuti dalam bekerja" },
  { id: 10, trait: "enterprising", text: "Saya suka memengaruhi dan mempersuasi orang" },
  { id: 11, trait: "investigative", text: "Saya suka melakukan eksperimen" },
  { id: 12, trait: "social", text: "Saya suka mengajar atau melatih orang lain" },
  { id: 13, trait: "social", text: "Saya suka membantu dan memecahkan masalah yang dialami orang lain" },
  { id: 14, trait: "realistic", text: "Saya suka merawat binatang" },
  { id: 15, trait: "conventional", text: "Saya tidak keberatan bekerja '9-to-5' di kantor" },
  { id: 16, trait: "enterprising", text: "Saya suka menjual sesuatu" },
  { id: 17, trait: "artistic", text: "Saya suka menulis" },
  { id: 18, trait: "investigative", text: "Saya menikmati membaca topik tentang science dan penelitian" },
  { id: 19, trait: "enterprising", text: "Saya cepat dalam mengambil tanggung jawab baru" },
  { id: 20, trait: "social", text: "Saya tertarik untuk menyembuhkan penyakit yang dialami orang lain" },
  { id: 21, trait: "investigative", text: "Saya suka mencari tahu mengapa sebuah benda bisa bekerja" },
  { id: 22, trait: "realistic", text: "Saya suka menyusun dan merakit sesuatu" },
  { id: 23, trait: "artistic", text: "Saya adalah orang yang kreatif" },
  { id: 24, trait: "conventional", text: "Saya memberi perhatian terhadap detail" },
  { id: 25, trait: "conventional", text: "Saya suka mengetik" },
  { id: 26, trait: "investigative", text: "Saya suka menganalisis sesuatu (masalah/situasi)" },
  { id: 27, trait: "artistic", text: "Saya suka memainkan instrumen (atau bernyanyi)" },
  { id: 28, trait: "social", text: "Saya suka mempelajari budaya yang berbeda" },
  { id: 29, trait: "enterprising", text: "Saya ingin memulai bisnis saya sendiri" },
  { id: 30, trait: "realistic", text: "Saya suka memasak" },
  { id: 31, trait: "artistic", text: "Saya suka bermain peran" },
  { id: 32, trait: "realistic", text: "Saya adalah orang yang praktikal" },
  { id: 33, trait: "investigative", text: "Saya suka bermain-main dengan angka dan diagram" },
  { id: 34, trait: "social", text: "Saya suka mendiskusikan berbagai isu" },
  { id: 35, trait: "conventional", text: "Saya suka mendokumentasikan pekerjaan saya dengan baik (menyimpan file, menyusun file, dsb.)" },
  { id: 36, trait: "enterprising", text: "Saya suka menjadi pemimpin" },
  { id: 37, trait: "realistic", text: "Saya suka bekerja di tempat outdoor" },
  { id: 38, trait: "conventional", text: "Saya suka bekerja di kantor" },
  { id: 39, trait: "investigative", text: "Saya hebat dalam matematika" },
  { id: 40, trait: "social", text: "Saya suka menolong orang" },
  { id: 41, trait: "artistic", text: "Saya suka menggambar" },
  { id: 42, trait: "enterprising", text: "Saya suka berpidato" },
];

const VARK_QUESTIONS = [
  {
    id: 1,
    text: "Saat belajar, saya:",
    options: [
      { label: "belajar dengan berdiskusi.", trait: "auditory" },
      { label: "membaca buku, artikel dan diktat.", trait: "readwrite" },
      { label: "menggunakan contoh dan penerapan.", trait: "kinesthetic" },
      { label: "mencari pola tertentu.", trait: "visual" },
    ],
  },
  {
    id: 2,
    text: "Dalam memilih karir atau jurusan pendidikan, yang penting bagi saya adalah:",
    options: [
      { label: "pekerjaan yang memakai desain, peta, atau bagan.", trait: "visual" },
      { label: "aplikasi ilmu pada kondisi nyata yang dihadapi.", trait: "kinesthetic" },
      { label: "berkomunikasi dengan orang dengan berdiskusi.", trait: "auditory" },
      { label: "penggunaan kata yang tepat dalam komunikasi tertulis.", trait: "readwrite" },
    ],
  },
  {
    id: 3,
    text: "Saya ingin belajar cara memotret dengan lebih baik. Saya akan:",
    options: [
      { label: "membaca instruksi tertulis mengenai cara pemakaian kamera itu.", trait: "readwrite" },
      { label: "bertanya dan berdiskusi mengenai kamera dan fiturnya.", trait: "auditory" },
      { label: "melihat diagram yang menunjukkan komponen kamera itu.", trait: "visual" },
      { label: "melihat contoh hasil yang baik dan yang jelek dari kamera itu.", trait: "kinesthetic" },
    ],
  },
  {
    id: 4,
    text: "Saya ingin mengetahui lebih dalam mengenai suatu tur wisata yang saya rencanakan. Saya akan:",
    options: [
      { label: "melihat petanya dan mengamati lokasi-lokasi turnya.", trait: "visual" },
      { label: "melihat detail kegiatan dan aktivitas yang akan dilakukan.", trait: "kinesthetic" },
      { label: "membaca perincian jadwal kegiatan tur tersebut.", trait: "readwrite" },
      { label: "bicara dengan pengelola atau peserta lain di tur itu.", trait: "auditory" },
    ],
  },
  {
    id: 5,
    text: "Saya ingin mempelajari suatu jenis permainan kartu yang baru. Saya akan:",
    options: [
      { label: "melihat orang lain bermain sebelum saya ikut mencoba.", trait: "kinesthetic" },
      { label: "mendengar penjelasan orang serta bertanya padanya.", trait: "auditory" },
      { label: "memakai diagram yang menjelaskan tahap, langkah dan strategi permainannya.", trait: "visual" },
      { label: "membaca petunjuk tertulis pada permainan itu.", trait: "readwrite" },
    ],
  },
  {
    id: 6,
    text: "Saya ingin mendatangi satu toko yang disarankan teman. Saya akan:",
    options: [
      { label: "menuliskan alamat lengkap dan daftar belokan yang harus saya ingat.", trait: "readwrite" },
      { label: "menggunakan peta yang menunjukkan lokasi toko itu.", trait: "visual" },
      { label: "mencari toko itu berdasarkan tempat lain di sekitar situ yang sudah saya tahu.", trait: "kinesthetic" },
      { label: "bertanya pada teman yang tahu arah toko itu.", trait: "auditory" },
    ],
  },
  {
    id: 7,
    text: "Saya ingin mempelajari suatu program baru di komputer. Saya akan:",
    options: [
      { label: "membaca intruksi tertulis pada petunjuknya.", trait: "readwrite" },
      { label: "mengikuti diagram pada buku petunjuknya.", trait: "visual" },
      { label: "langsung mencoba dan belajar dari kesalahan.", trait: "kinesthetic" },
      { label: "bicara dengan orang yang paham tentang program itu.", trait: "auditory" },
    ],
  },
  {
    id: 8,
    text: "Saya baru saja menyelesaikan suatu lomba atau suatu ujian dan saya ingin umpan balik orang lain. Saya mengharapkan:",
    options: [
      { label: "umpan balik berupa penjelasan tertulis mengenai hasil pekerjaan saya.", trait: "readwrite" },
      { label: "umpan balik dalam bentuk grafik mengenai hasil pekerjaan saya.", trait: "visual" },
      { label: "umpan balik yang berisi contoh-contoh dari yang saya kerjakan.", trait: "kinesthetic" },
      { label: "umpan balik yang disampaikan langsung kepada saya.", trait: "auditory" },
    ],
  },
  {
    id: 9,
    text: "Saya lebih suka pembicara yang dalam presentasinya menggunakan:",
    options: [
      { label: "diagram, bagan, peta atau grafik.", trait: "visual" },
      { label: "kesempatan tanya jawab, diskusi kelompok atau pembicara tamu.", trait: "auditory" },
      { label: "cetakan diktat, buku atau bacaan lain.", trait: "readwrite" },
      { label: "peragaan, model peraga, atau kesempatan mencoba langsung.", trait: "kinesthetic" },
    ],
  },
  {
    id: 10,
    text: "Saya ingin mempelajari suatu proyek kerja yang baru. Saya akan meminta:",
    options: [
      { label: "diagram yang berisi tahap-tahap proyek itu lengkap dengan bagan berisi manfaat dan biayanya.", trait: "visual" },
      { label: "laporan tertulis yang menjelaskan bagian utama proyek tersebut.", trait: "readwrite" },
      { label: "kesempatan berdiskusi mengenai proyek tersebut.", trait: "auditory" },
      { label: "contoh-contoh proyek serupa yang sudah berhasil.", trait: "kinesthetic" },
    ],
  },
  {
    id: 11,
    text: "Suatu situs internet memiliki video mengenai cara membuat suatu grafik khusus. Di situs itu ada orang yang bicara, ada daftar langkah pembuatan video, dan ada beberapa diagram. Saya paling mengerti isi situs itu dengan cara:",
    options: [
      { label: "melihat tindakan orangnya.", trait: "kinesthetic" },
      { label: "membaca instruksi yang tertulis.", trait: "readwrite" },
      { label: "mendengar suara yang menjelaskan.", trait: "auditory" },
      { label: "mengamati diagram petunjuknya.", trait: "visual" },
    ],
  },
  {
    id: 12,
    text: "Saya ingin merakit satu set meja kayu yang belum jadi. Saya paling mengerti jika:",
    options: [
      { label: "mengikuti diagram instruksi yang dilampirkan.", trait: "visual" },
      { label: "menonton video orang merakit meja yang serupa.", trait: "kinesthetic" },
      { label: "mendengar saran dari orang yang pernah merakitnya.", trait: "auditory" },
      { label: "membaca penjelasan tertulis yang dilampirkan.", trait: "readwrite" },
    ],
  },
  {
    id: 13,
    text: "Ketika belajar sesuatu dari internet, saya menyukai:",
    options: [
      { label: "situs dengan suara, siaran internet atau wawancara.", trait: "auditory" },
      { label: "uraian tertulis, daftar dan penjelasan yang menarik.", trait: "readwrite" },
      { label: "video cara melakukan atau membuat sesuatu.", trait: "kinesthetic" },
      { label: "desain dan fitur visual yang menarik.", trait: "visual" },
    ],
  },
  {
    id: 14,
    text: "Saya ingin menabung lebih banyak dan mempertimbangkan beberapa cara. Saya akan:",
    options: [
      { label: "bicara dengan ahli keuangan mengenai cara-cara berhemat yang bisa ditempuh.", trait: "auditory" },
      { label: "memakai grafik yang menunjukkan variasi pilihan dan jangka waktu yang dibutuhkan.", trait: "visual" },
      { label: "membaca brosur tertulis yang menjelaskan cara-cara berhemat secara detail.", trait: "readwrite" },
      { label: "mempertimbangkan contoh dari setiap cara penghematan berdasarkan kondisi keuangan saya.", trait: "kinesthetic" },
    ],
  },
  {
    id: 15,
    text: "Saya mempunyai masalah jantung. Saya lebih suka dokter yang:",
    options: [
      { label: "menunjukkan diagram mengenai masalah yang saya hadapi.", trait: "visual" },
      { label: "menguraikan masalah yang saya hadapi.", trait: "auditory" },
      { label: "memberikan bacaan mengenai masalah yang saya hadapi.", trait: "readwrite" },
      { label: "memakai alat peraga jantung untuk menunjukkan masalah yang saya hadapi.", trait: "kinesthetic" },
    ],
  },
  {
    id: 16,
    text: "Saya tertarik dengan suatu rumah atau apartemen. Sebelum berkunjung, saya ingin:",
    options: [
      { label: "berdiskusi dengan pemiliknya.", trait: "auditory" },
      { label: "melihat video rumah atau apartemen itu.", trait: "kinesthetic" },
      { label: "keterangan tertulis mengenai kamar-kamar dan fiturnya.", trait: "readwrite" },
      { label: "denah ruangan dan peta area sekitarnya.", trait: "visual" },
    ],
  },
];

const TESTS = {
  riasec: {
    id: "riasec",
    label: "Tes RIASEC",
    title: "Tes RIASEC",
    description: "Jawab semua pernyataan.",
    kind: "scale",
    traits: RIASEC_TRAITS,
    questions: RIASEC_QUESTIONS,
    maxScore: 28,
  },
  vark: {
    id: "vark",
    label: "Tes VARK",
    title: "Tes VARK",
    description: "Pilih satu atau lebih jawaban yang sesuai.",
    kind: "multi",
    traits: VARK_TRAITS,
    questions: VARK_QUESTIONS,
    maxScore: VARK_QUESTIONS.length,
  },
};

const state = {
  participant: null,
  activeTestId: null,
  activeResult: null,
  currentQuestionIndex: 0,
  answers: {},
  chatHistory: [],
};

const profileSection = document.querySelector("#profileSection");
const dashboardSection = document.querySelector("#dashboardSection");
const testSection = document.querySelector("#testSection");
const resultPageSection = document.querySelector("#resultPageSection");
const profileForm = document.querySelector("#profileForm");
const profileMessage = document.querySelector("#profileMessage");
const newParticipantButton = document.querySelector("#newParticipantButton");
const participantName = document.querySelector("#participantName");
const participantMeta = document.querySelector("#participantMeta");
const backToMenuButton = document.querySelector("#backToMenuButton");
const backFromResultButton = document.querySelector("#backFromResultButton");
const retakeTestButton = document.querySelector("#retakeTestButton");
const quizForm = document.querySelector("#quizForm");
const activeTestLabel = document.querySelector("#activeTestLabel");
const activeTestTitle = document.querySelector("#activeTestTitle");
const activeTestDescription = document.querySelector("#activeTestDescription");
const prevQuestionButton = document.querySelector("#prevQuestionButton");
const nextQuestionButton = document.querySelector("#nextQuestionButton");
const formMessage = document.querySelector("#formMessage");
const progressText = document.querySelector("#progressText");
const progressPercent = document.querySelector("#progressPercent");
const progressBar = document.querySelector("#progressBar");
const resultTitle = document.querySelector("#resultTitle");
const resultGrid = document.querySelector("#resultGrid");
const topProfile = document.querySelector("#topProfile");
const emailStatus = document.querySelector("#emailStatus");
const chatTitle = document.querySelector("#chatTitle");
const chatMessages = document.querySelector("#chatMessages");
const chatSuggestions = document.querySelector("#chatSuggestions");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");

function loadParticipants() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveParticipants(participants) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
}

function createParticipant(formData) {
  return {
    id: `user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: formData.get("name").trim(),
    studentClass: formData.get("studentClass").trim(),
    age: Number(formData.get("age")),
    phone: formData.get("phone").trim(),
    createdAt: new Date().toISOString(),
    attempts: [],
    emailSentFingerprint: null,
    emailSentAt: null,
  };
}

function saveCurrentParticipant() {
  const participants = loadParticipants();
  const currentIndex = participants.findIndex((item) => item.id === state.participant.id);

  if (currentIndex >= 0) {
    participants[currentIndex] = state.participant;
  } else {
    participants.push(state.participant);
  }

  saveParticipants(participants);
}

function showDashboard() {
  profileSection.hidden = true;
  dashboardSection.hidden = false;
  testSection.hidden = true;
  resultPageSection.hidden = true;
  newParticipantButton.hidden = false;

  participantName.textContent = state.participant.name;
  participantMeta.innerHTML = `
    <span class="meta-pill">Kelas ${escapeHtml(state.participant.studentClass)}</span>
    <span class="meta-pill">${state.participant.age} tahun</span>
    <span class="meta-pill">${escapeHtml(state.participant.phone)}</span>
  `;
}

function showProfileForm() {
  state.participant = null;
  state.activeTestId = null;
  state.activeResult = null;
  state.currentQuestionIndex = 0;
  state.answers = {};
  state.chatHistory = [];

  profileForm.reset();
  profileMessage.textContent = "";
  profileSection.hidden = false;
  dashboardSection.hidden = true;
  testSection.hidden = true;
  resultPageSection.hidden = true;
  newParticipantButton.hidden = true;
}

function startTest(testId) {
  const test = TESTS[testId];
  state.activeTestId = testId;
  state.activeResult = null;
  state.currentQuestionIndex = 0;
  state.answers = {};
  state.chatHistory = [];

  dashboardSection.hidden = true;
  testSection.hidden = false;
  resultPageSection.hidden = true;

  activeTestLabel.textContent = test.label;
  activeTestTitle.textContent = test.title;
  activeTestDescription.textContent = test.description;

  renderCurrentQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCurrentQuestion() {
  const test = TESTS[state.activeTestId];
  const question = test.questions[state.currentQuestionIndex];
  const options = test.kind === "scale" ? SCALE_OPTIONS : question.options;
  const optionsClass = test.kind === "multi" ? "option-group vark-options" : "option-group";
  const currentAnswer = state.answers[question.id];

  quizForm.innerHTML = `
    <article class="question-card single-question-card">
      <div class="question-head">
        <span class="question-number">${question.id}</span>
        <div>
          <p class="question-text">${question.text}</p>
        </div>
      </div>
      <div class="${optionsClass}">
        ${options.map((option, index) => renderOption(test, question, option, index, currentAnswer)).join("")}
      </div>
    </article>
  `;

  formMessage.textContent = "";
  prevQuestionButton.disabled = state.currentQuestionIndex === 0;
  nextQuestionButton.textContent = isLastQuestion() ? "Lihat hasil" : "Berikutnya";
  updateProgress();
}

function renderOption(test, question, option, index, currentAnswer) {
  const inputId = `${test.id}-${question.id}-${index}`;
  const value = test.kind === "scale" ? String(option.value) : option.trait;
  const inputType = test.kind === "multi" ? "checkbox" : "radio";
  const checked = test.kind === "multi"
    ? (Array.isArray(currentAnswer) && currentAnswer.includes(value) ? "checked" : "")
    : (String(currentAnswer ?? "") === value ? "checked" : "");
  const required = test.kind === "multi" ? "" : "required";

  return `
    <label class="option-label" for="${inputId}">
      <input
        id="${inputId}"
        type="${inputType}"
        name="question-${question.id}"
        value="${value}"
        ${checked}
        ${required}
      />
      <span class="option-box">${option.label}</span>
    </label>
  `;
}

function isLastQuestion() {
  const test = TESTS[state.activeTestId];
  return state.currentQuestionIndex === test.questions.length - 1;
}

function getCurrentQuestion() {
  const test = TESTS[state.activeTestId];
  return test.questions[state.currentQuestionIndex];
}

function saveSelectedAnswer() {
  const test = TESTS[state.activeTestId];
  const question = getCurrentQuestion();
  const selected = [...quizForm.querySelectorAll(`input[name="question-${question.id}"]:checked`)];

  if (test.kind === "multi") {
    state.answers[question.id] = selected.map((item) => item.value);
    return true;
  }

  if (!selected.length) return false;

  state.answers[question.id] = selected[0].value;
  return true;
}

function getAnswers() {
  const test = TESTS[state.activeTestId];

  return test.questions.map((question) => ({
    questionId: question.id,
    trait: question.trait,
    value: state.answers[question.id] ?? null,
  }));
}

function calculateScores(answers) {
  const test = TESTS[state.activeTestId];
  const scores = Object.keys(test.traits).reduce((result, trait) => {
    result[trait] = 0;
    return result;
  }, {});

  answers.forEach((answer) => {
    if (test.kind === "scale") {
      scores[answer.trait] += Number(answer.value);
    } else if (test.kind === "multi") {
      answer.value.forEach((trait) => {
        scores[trait] += 1;
      });
    } else {
      scores[answer.value] += 1;
    }
  });

  return scores;
}

function updateProgress() {
  const test = TESTS[state.activeTestId];
  const answered = Object.keys(state.answers).length;
  const current = state.currentQuestionIndex + 1;
  const percent = Math.round((answered / test.questions.length) * 100);

  progressText.textContent = `Pertanyaan ${current} dari ${test.questions.length}`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
}

function finishTest() {
  const test = TESTS[state.activeTestId];
  if (!saveSelectedAnswer()) {
    formMessage.textContent = "Pilih jawaban dulu.";
    return;
  }

  const answers = getAnswers();
  const unanswered = test.kind === "multi"
    ? []
    : answers.filter((answer) => answer.value === null);

  if (unanswered.length > 0) {
    formMessage.textContent = "Masih ada pertanyaan yang belum dijawab.";
    return;
  }

  const scores = calculateScores(answers);
  const attempt = saveAttempt(scores, answers);
  showResultPage(scores);
  submitAttemptResult(attempt);
}

function showResultPage(scores) {
  const test = TESTS[state.activeTestId];
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = sortedScores[0][1];
  const topTraits = sortedScores
    .filter(([, score]) => score === topScore)
    .map(([trait]) => test.traits[trait]);

  testSection.hidden = true;
  dashboardSection.hidden = true;
  resultPageSection.hidden = false;
  emailStatus.textContent = "";
  resultTitle.textContent = `Skor ${test.label}`;
  resultGrid.innerHTML = sortedScores
    .map(([trait, score]) => {
      const percent = Math.round((score / test.maxScore) * 100);

      return `
        <div class="result-item">
          <div class="result-meta">
            <span>${test.traits[trait]}</span>
            <span>${score}/${test.maxScore}</span>
          </div>
          <div class="score-bar-track">
            <div class="score-bar" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
    })
    .join("");

  topProfile.textContent = `Kategori tertinggi: ${topTraits.join(", ")}.`;
  renderChatIntro(topTraits);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderChatIntro(topTraits) {
  const test = TESTS[state.activeTestId];
  chatTitle.textContent = `Tanya soal ${test.label}`;
  chatMessages.innerHTML = "";
  state.chatHistory = [];
  appendMessage(
    "bot",
    `Kamu bisa tanya soal hasil ${test.label}.\n\nHasil tertinggi: **${topTraits.join(", ")}**.`,
  );
  renderChatSuggestions();
}

function saveAttempt(scores, answers) {
  const test = TESTS[state.activeTestId];
  const attempt = {
    id: `attempt-${Date.now()}`,
    testId: test.id,
    testLabel: test.label,
    scores,
    answers,
    createdAt: new Date().toISOString(),
  };

  state.participant.attempts.push(attempt);
  state.activeResult = attempt;
  saveCurrentParticipant();
  return attempt;
}

function getLatestAttempt(testId) {
  return [...state.participant.attempts].reverse().find((attempt) => attempt.testId === testId);
}

async function submitAttemptResult(attempt) {
  const riasec = getLatestAttempt("riasec");
  const vark = getLatestAttempt("vark");

  emailStatus.textContent = "Menyimpan hasil...";

  try {
    const response = await fetch("/api/send-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant: state.participant,
        attempt,
        riasec,
        vark,
        labels: {
          riasec: RIASEC_TRAITS,
          vark: VARK_TRAITS,
        },
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      emailStatus.textContent = data.message || "Hasil gagal dikirim.";
      return;
    }

    if (data.emailSent) {
      const riasec = getLatestAttempt("riasec");
      const vark = getLatestAttempt("vark");
      state.participant.emailSentFingerprint = `${riasec.id}:${vark.id}`;
      state.participant.emailSentAt = new Date().toISOString();
      saveCurrentParticipant();
    }

    emailStatus.textContent = data.message || (data.emailSent
      ? "JSON tersimpan. Email terkirim."
      : "JSON tersimpan.");
  } catch {
    emailStatus.textContent = "Hasil gagal dikirim.";
  }
}

function appendMessage(sender, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}`;
  bubble.innerHTML = sender === "bot" ? formatBotMessage(text) : escapeHtml(text);
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  state.chatHistory.push({ sender, text });
}

async function getBotReply(message) {
  const test = TESTS[state.activeTestId];
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      testId: test.id,
      testLabel: test.label,
      traits: test.traits,
      participant: state.participant,
      result: state.activeResult,
      latestResults: {
        riasec: getLatestAttempt("riasec"),
        vark: getLatestAttempt("vark"),
      },
      labels: {
        riasec: RIASEC_TRAITS,
        vark: VARK_TRAITS,
      },
      history: state.chatHistory.slice(-10),
      message,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return error.message || "Bot belum siap. Cek server dan API key.";
  }

  const data = await response.json();
  const reply = String(data.reply || "").trim();
  if (!reply || /^tidak ada balasan\.?$/i.test(reply)) {
    return "Maaf, aku belum bisa membuat jawaban. Coba tanya ulang tentang jurusan, kuliah, karier, atau cara belajar dari hasil tesmu.";
  }
  return reply;
}

function renderChatSuggestions() {
  const suggestions = getChatSuggestions();
  chatSuggestions.innerHTML = suggestions
    .map((question) => `
      <button class="suggestion-chip" type="button" data-question="${escapeHtml(question)}">
        ${escapeHtml(question)}
      </button>
    `)
    .join("");
}

function getChatSuggestions() {
  if (state.activeTestId === "riasec") {
    return [
      "Saya cocok masuk jurusan apa?",
      "Bagaimana cara mengembangkan minat saya?",
    ];
  }

  return [
    "Saya cocok masuk jurusan apa?",
    "Gaya belajar saya sebaiknya bagaimana?",
  ];
}

function formatBotMessage(text) {
  const normalized = text
    .replace(/\r/g, "")
    .replace(/(Rekomendasi[^:]*:)\s+(?=\d+\.)/gi, "$1\n")
    .replace(/\s+(\d+\.\s)/g, "\n$1")
    .trim();
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  let html = "";
  let listItems = [];

  lines.forEach((line) => {
    const numbered = line.match(/^\d+\.\s*(.+)$/);
    if (numbered) {
      listItems.push(`<li>${formatInline(numbered[1])}</li>`);
      return;
    }

    if (listItems.length) {
      html += `<ol>${listItems.join("")}</ol>`;
      listItems = [];
    }

    html += `<p>${formatInline(line)}</p>`;
  });

  if (listItems.length) {
    html += `<ol>${listItems.join("")}</ol>`;
  }

  return html || "<p>Maaf, aku belum bisa membuat jawaban. Coba tanya ulang tentang hasil tesmu.</p>";
}

function formatInline(text) {
  return escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function handleProfileSubmit(event) {
  event.preventDefault();
  const formData = new FormData(profileForm);

  if (!formData.get("phone").trim().match(/^[0-9+\-\s()]{8,}$/)) {
    profileMessage.textContent = "No. HP belum valid.";
    return;
  }

  state.participant = createParticipant(formData);
  saveCurrentParticipant();
  showDashboard();
}

function handleAnswerChange() {
  saveSelectedAnswer();
  updateProgress();
}

function handleNextQuestion() {
  if (!saveSelectedAnswer()) {
    formMessage.textContent = "Pilih jawaban dulu.";
    return;
  }

  if (isLastQuestion()) {
    finishTest();
    return;
  }

  state.currentQuestionIndex += 1;
  renderCurrentQuestion();
}

function handlePrevQuestion() {
  if (state.currentQuestionIndex === 0) return;
  saveSelectedAnswer();
  state.currentQuestionIndex -= 1;
  renderCurrentQuestion();
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const message = chatInput.value.trim();

  await sendChatMessage(message);
}

async function sendChatMessage(message) {
  if (!message) return;

  appendMessage("user", message);
  chatInput.value = "";

  appendMessage("bot", "Menjawab...");
  const loadingBubble = chatMessages.lastElementChild;
  const reply = await getBotReply(message);
  loadingBubble.innerHTML = formatBotMessage(reply);
  state.chatHistory[state.chatHistory.length - 1].text = reply;
}

profileForm.addEventListener("submit", handleProfileSubmit);
newParticipantButton.addEventListener("click", showProfileForm);
backToMenuButton.addEventListener("click", showDashboard);
backFromResultButton.addEventListener("click", showDashboard);
retakeTestButton.addEventListener("click", () => startTest(state.activeTestId));
quizForm.addEventListener("change", handleAnswerChange);
prevQuestionButton.addEventListener("click", handlePrevQuestion);
nextQuestionButton.addEventListener("click", handleNextQuestion);
chatForm.addEventListener("submit", handleChatSubmit);
chatSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-question]");
  if (!button) return;
  sendChatMessage(button.dataset.question);
});

document.querySelectorAll("[data-test-id]").forEach((button) => {
  button.addEventListener("click", () => startTest(button.dataset.testId));
});
