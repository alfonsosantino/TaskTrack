
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import dashboard from '../legacy-pages/index.html?raw'
import addTask from '../legacy-pages/add-task.html?raw'
import calendar from '../legacy-pages/calendar.html?raw'
import progress from '../legacy-pages/progress.html?raw'
import profile from '../legacy-pages/profile.html?raw'

import '../css/style.css'

const pages = {
  '/': { html: dashboard, script: 'dashboard.js', title: 'Dashboard • TaskTrack' },
  '/index.html': { html: dashboard, script: 'dashboard.js', title: 'Dashboard • TaskTrack' },
  '/add-task.html': { html: addTask, script: 'add-task.js', title: 'Add Task • TaskTrack' },
  '/calendar.html': { html: calendar, script: 'calendar.js', title: 'Calendar • TaskTrack' },
  '/progress.html': { html: progress, script: 'progress.js', title: 'Progress • TaskTrack' },
  '/profile.html': { html: profile, script: 'profile.js', title: 'Profile • TaskTrack' },
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
}

export default function App() {
  const { pathname } = useLocation()
  const page = pages[pathname] || pages['/']

  const mainContent =
    page.html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0] || ''

  useEffect(() => {
    let active = true
    document.title = page.title

    async function initialize() {
      try {
        await loadScript('/js/app.js')
        await loadScript(`/js/${page.script}`)

        if (active) {
          document.dispatchEvent(new Event('DOMContentLoaded'))
        }
      } catch (error) {
        console.error('TaskTrack initialization failed:', error)
      }
    }

    initialize()

    return () => {
      active = false
    }
  }, [pathname, page])

  return (
    <div dangerouslySetInnerHTML={{ __html: mainContent }} />
  )
}
