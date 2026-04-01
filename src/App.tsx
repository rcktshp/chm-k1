import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SessionList from './pages/SessionList';
import NewSession from './pages/NewSession';
import SessionDetail from './pages/SessionDetail';
import EditSession from './pages/EditSession';
import Stats from './pages/Stats';
import { useSessions } from './hooks/useSessions';

export default function App() {
  const { sessions, add, update, remove } = useSessions();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<SessionList sessions={sessions} />} />
          <Route path="/new" element={<NewSession onSave={add} />} />
          <Route
            path="/session/:id"
            element={<SessionDetail sessions={sessions} onDelete={remove} />}
          />
          <Route
            path="/edit/:id"
            element={<EditSession sessions={sessions} onUpdate={update} />}
          />
          <Route path="/stats" element={<Stats sessions={sessions} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
