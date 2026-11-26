import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout, PublicLayout, RequireAuth, StudentLayout } from './components/Layouts';
import { Dashboard, Results, Settings } from './pages/admin/AdminPages';
import Students from './pages/admin/Students';
import TestForm from './pages/admin/TestForm';
import Tests from './pages/admin/Tests';
import Login from './pages/Login';
import Payment from './pages/Payment';
import Register from './pages/Register';
import { About, FeeDetail, Home, NotFound } from './pages/student/InfoPages';
import Outline from './pages/student/Outline';
import Result from './pages/student/Result';
import TestList from './pages/student/TestList';
import TestStart from './pages/student/TestStart';
import Transcribe from './pages/student/Transcribe';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route element={<PublicLayout />}>
        <Route path="/register" element={<Register />} />
        <Route path="/payment" element={<Payment />} />
      </Route>

      {/* Student area – mockup pages 4, 9, 12 */}
      <Route element={<RequireAuth role="STUDENT"><StudentLayout /></RequireAuth>}>
        <Route path="/home" element={<Home />} />
        <Route path="/shorthand" element={<TestList key="SHORTHAND" category="SHORTHAND" />} />
        <Route path="/english-typing" element={<TestList key="ENGLISH_TYPING" category="ENGLISH_TYPING" />} />
        <Route path="/hindi-typing" element={<TestList key="HINDI_TYPING" category="HINDI_TYPING" />} />
        <Route path="/fee" element={<FeeDetail />} />
        <Route path="/about" element={<About />} />
      </Route>

      {/* Full-screen test pages – mockup pages 5, 6, 7, 10 */}
      <Route path="/test/:id" element={<RequireAuth role="STUDENT"><TestStart /></RequireAuth>} />
      <Route path="/test/:id/write" element={<RequireAuth role="STUDENT"><Transcribe /></RequireAuth>} />
      <Route path="/result/:id" element={<RequireAuth><Result /></RequireAuth>} />
      <Route path="/outline/:testId" element={<RequireAuth><Outline /></RequireAuth>} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth role="ADMIN"><AdminLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="tests" element={<Tests />} />
        <Route path="tests/new" element={<TestForm key="new" />} />
        <Route path="tests/:id" element={<TestForm />} />
        <Route path="results" element={<Results />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
