;(function () {
  try {
    var stored = window.localStorage.getItem('la28_unofficial_session_picker_theme')
    if (stored === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else if (stored === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  } catch {}
})()
