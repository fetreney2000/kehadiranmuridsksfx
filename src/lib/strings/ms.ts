/**
 * Centralised Bahasa Melayu Malaysia strings for all front-facing UI.
 * Every label, button, message, validation error, empty state etc.
 * must reference this file — no inline hardcoded strings.
 */

export const MS = {
  // App branding
  appName: "Kehadiran Murid",
  appShortName: "KM",
  appDescription: "Sistem Pengurusan Kehadiran Murid Sekolah",
  schoolName: "SK SFX Keningau",
  schoolTagline: "Sekolah Kebangsaan Seri Fx Keningau",

  // Login
  login: {
    title: "Log Masuk",
    subtitle: "Sistem Kehadiran Murid SK SFX Keningau",
    username: "Nama Pengguna",
    password: "Kata Laluan",
    loginButton: "Log Masuk",
    loggingIn: "Sedang log masuk...",
    errorInvalid: "Nama pengguna atau kata laluan salah.",
    errorInactive: "Akaun ini telah dinyahaktifkan. Hubungi pentadbir.",
    welcomeBack: "Selamat kembali,",
  },

  // Navigation
  nav: {
    dashboard: "Papan Pemuka",
    attendance: "Daftar Kehadiran",
    students: "Murid",
    classes: "Kelas",
    users: "Pengguna",
    reports: "Laporan",
    qrCodes: "Kod QR",
    kelasSaya: "Kelas Saya",
    profile: "Profil",
    logout: "Log Keluar",
  },

  // Roles
  role: {
    pentadbir: "Pentadbir",
    guru_kelas: "Guru Kelas",
    guru_biasa: "Guru Biasa",
  },

  // Common actions
  actions: {
    save: "Simpan",
    cancel: "Batal",
    delete: "Hapus",
    edit: "Sunting",
    create: "Tambah",
    search: "Cari",
    export: "Eksport",
    print: "Cetak",
    close: "Tutup",
    confirm: "Sahkan",
    back: "Kembali",
    next: "Seterusnya",
    previous: "Sebelumnya",
    reset: "Set Semula",
    filter: "Tapis",
    refresh: "Segar Semula",
    yes: "Ya",
    no: "Tidak",
  },

  // Status
  status: {
    label: "Status",
    active: "Aktif",
    inactive: "Tidak Aktif",
    present: "Hadir",
    absent: "Tidak Hadir",
    loading: "Sedang dimuatkan...",
    empty: "Tiada data.",
    error: "Ralat berlaku. Sila cuba lagi.",
    noResults: "Tiada hasil dijumpai.",
  },

  // Sex
  sex: {
    L: "Lelaki",
    P: "Perempuan",
  },

  // Attendance
  attendance: {
    scanMode: "Imbas Kod QR",
    toggleMode: "Tukar Manual",
    markPresent: "Tandakan Hadir",
    markAllPresent: "Tandakan Semua Hadir",
    scanSuccess: "{name} berjaya ditanda hadir!",
    alreadyMarked: "{name} telah pun ditanda hadir hari ini.",
    batchSaved: "{count} rekod kehadiran disimpan.",
    noStudents: "Tiada murid dalam kelas ini.",
    cameraDenied: "Akses kamera tidak dibenarkan. Sila gunakan mod manual atau berikan kebenaran.",
    cameraUnavailable: "Kamera tidak tersedia pada peranti ini.",
    today: "Hari Ini",
    date: "Tarikh",
    method: "Kaedah",
    recordedBy: "Direkod Oleh",
  },

  // Reports
  reports: {
    title: "Laporan Kehadiran",
    dailyReport: "Laporan Harian",
    weeklyReport: "Laporan Mingguan",
    monthlyReport: "Laporan Bulanan",
    yearlyReport: "Laporan Tahunan",
    customRange: "Julat Tersuai",
    dateFrom: "Dari",
    dateTo: "Hingga",
    allClasses: "Semua Kelas",
    wholeSchool: "Seluruh Sekolah",
    totalStudents: "Jumlah Murid",
    totalPresent: "Jumlah Hadir",
    totalAbsent: "Jumlah Tidak Hadir",
    attendancePercentage: "Peratus Kehadiran",
    absentToday: "Murid Tidak Hadir Hari Ini",
    perClassBreakdown: "Pecahan Mengikut Kelas",
    exportExcel: "Eksport ke Excel",
    exportPDF: "Eksport ke PDF",
    generatedOn: "Dijana pada",
    schoolName: "Sekolah Kebangsaan Seri Fx",
    reportTitle: "Laporan Kehadiran Murid",
    summaryBlock: "Ringkasan",
  },

  // Student management
  students: {
    title: "Pengurusan Murid",
    addStudent: "Tambah Murid",
    editStudent: "Sunting Murid",
    deleteStudent: "Hapus Murid",
    deleteConfirm: "Adakah anda pasti mahu menghapuskan murid ini?",
    name: "Nama Murid",
    sex: "Jantina",
    class: "Kelas",
    qrCode: "Kod QR",
    generateQR: "Jana Kod QR",
    printQR: "Cetak Kod QR",
    printAllQR: "Cetak Semua Kod QR",
    noClass: "Tiada Kelas",
    importStudents: "Import Murid",
  },

  // Class management
  classes: {
    title: "Pengurusan Kelas",
    addClass: "Tambah Kelas",
    editClass: "Sunting Kelas",
    deleteClass: "Hapus Kelas",
    deleteConfirm: "Adakah anda pasti mahu menghapuskan kelas ini? Semua murid dalam kelas ini akan terjejas.",
    name: "Nama Kelas",
    teacher: "Guru Kelas",
    noTeacher: "Tiada Guru",
    studentCount: "Bilangan Murid",
  },

  // User management
  users: {
    title: "Pengurusan Pengguna",
    addUser: "Tambah Pengguna",
    editUser: "Sunting Pengguna",
    deleteUser: "Hapus Pengguna",
    resetPassword: "Set Semula Kata Laluan",
    newPassword: "Kata Laluan Baharu",
    fullName: "Nama Penuh",
    username: "Nama Pengguna",
    password: "Kata Laluan",
    role: "Peranan",
    class: "Kelas (Guru Kelas sahaja)",
    confirmDeactivate: "Nyahaktifkan pengguna ini?",
    confirmDelete: "Adakah anda pasti mahu menghapuskan pengguna ini?",
    passwordMinLength: "Kata laluan mestilah sekurang-kurangnya 6 aksara.",
  },

  // Profile
  profile: {
    title: "Profil Saya",
    changePassword: "Tukar Kata Laluan",
    currentPassword: "Kata Laluan Semasa",
    newPassword: "Kata Laluan Baharu",
    confirmNewPassword: "Sahkan Kata Laluan Baharu",
    passwordChanged: "Kata laluan berjaya ditukar.",
    passwordMismatch: "Kata laluan baharu tidak sepadan.",
    passwordWrong: "Kata laluan semasa salah.",
  },

  // QR
  qr: {
    title: "Kod QR Murid",
    generating: "Menjana kod QR...",
    printed: "Kod QR sedia untuk dicetak.",
    printLayout: "Klik Cetak untuk mencetak kod QR murid.",
    studentName: "Murid",
    className: "Kelas",
    previewTitle: "Kod QR — {name}",
    exportJPG: "JPG",
    exportPDF: "PDF",
  },

  // Validation
  validation: {
    required: "Ruangan ini wajib diisi.",
    minLength: "Mestilah sekurang-kurangnya {min} aksara.",
    maxLength: "Mestilah tidak melebihi {max} aksara.",
    invalidFormat: "Format tidak sah.",
    usernameTaken: "Nama pengguna telah digunakan.",
    classHasStudents: "Kelas ini mengandungi murid. Sila pindahkan atau hapuskan murid terlebih dahulu.",
  },

  // Settings
  settings: {
    title: "Tetapan",
    schoolDays: "Hari Persekolahan",
    monday: "Isnin",
    tuesday: "Selasa",
    wednesday: "Rabu",
    thursday: "Khamis",
    friday: "Jumaat",
    saturday: "Sabtu",
    sunday: "Ahad",
  },

  // Days & Months (Malay)
  days: {
    full: ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"],
    short: ["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"],
  },
  months: {
    full: [
      "Januari", "Februari", "Mac", "April",
      "Mei", "Jun", "Julai", "Ogos",
      "September", "Oktober", "November", "Disember",
    ],
    short: [
      "Jan", "Feb", "Mac", "Apr",
      "Mei", "Jun", "Jul", "Ogos",
      "Sep", "Okt", "Nov", "Dis",
    ],
  },

  // Pagination
  pagination: {
    showing: "Menunjukkan",
    to: "hingga",
    of: "daripada",
    results: "hasil",
    rowsPerPage: "Baris per halaman",
    goToPage: "Pergi ke halaman",
    page: "Halaman",
  },
} as const;