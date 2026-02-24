import { useState } from "react"
import HomePage from './HomePage'
import GroupPage from './GroupPage'

function App() {
  const [page, setPage] = useState("home")

  return page === "home"
    ? <HomePage onNavigate={setPage} />
    : <GroupPage onNavigate={setPage} />
}

export default App
