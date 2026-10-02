import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "sonner";
import "@/App.css";
import { PlayerProvider } from "@/context/PlayerContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlayerBar from "@/components/PlayerBar";
import Home from "@/pages/Home";
import Canciones from "@/pages/Canciones";
import SectionIndex from "@/pages/SectionIndex";
import Himnos from "@/pages/Himnos";
import HimnosGroup from "@/pages/HimnosGroup";
import SongDetail from "@/pages/SongDetail";
import Corneta from "@/pages/Corneta";
import Audios from "@/pages/Audios";
import Lemas from "@/pages/Lemas";
import LemasGroup from "@/pages/LemasGroup";
import Internacional from "@/pages/Internacional";
import Enlaces from "@/pages/Enlaces";
import Libro from "@/pages/Libro";
import Contacto from "@/pages/Contacto";
import Firma from "@/pages/Firma";
import Admin from "@/pages/Admin";
import PrintSheet from "@/pages/PrintSheet";
import NotFound from "@/pages/NotFound";
import Privacy from "@/pages/Privacy";
import { AuthProvider } from "@/context/AuthContext";
import { ArchiveProvider, useArchive } from "@/context/ArchiveContext";
import { IS_STATIC } from "@/lib/static";
import CookieConsent from "@/components/CookieConsent";

function ScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    window.__lenis = lenis;
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);
}

function Shell() {
  useLenis();
  const { pathname } = useLocation();
  const { version } = useArchive();
  if (pathname.startsWith("/imprimir/")) {
    return (
      <Routes key={version}>
        <Route path="/imprimir/himnos/:group/:slug" element={<PrintSheet />} />
        <Route path="/imprimir/:section/:slug" element={<PrintSheet />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }
  return (
    <div className="App min-h-screen bg-obsidian text-parchment flex flex-col">
      <ScrollManager />
      <Header />
      <main className="flex-1">
        <Routes key={version}>
          <Route path="/" element={<Home />} />
          <Route path="/canciones" element={<Canciones />} />
          <Route path="/canciones/paso-ligero" element={<SectionIndex section="pasoligero" base="/canciones/paso-ligero" />} />
          <Route path="/canciones/paso-ligero/:slug" element={<SongDetail section="pasoligero" base="/canciones/paso-ligero" crumb="Paso Ligero" />} />
          <Route path="/canciones/otras" element={<SectionIndex section="otras" base="/canciones/otras" />} />
          <Route path="/canciones/otras/:slug" element={<SongDetail section="otras" base="/canciones/otras" crumb="Otras Canciones" />} />
          <Route path="/canciones/himnos" element={<Himnos />} />
          <Route path="/canciones/himnos/:group" element={<HimnosGroup />} />
          <Route path="/canciones/himnos/:group/:slug" element={<SongDetail section="himnos" crumb="Himnos" />} />
          <Route path="/canciones/corneta" element={<Corneta />} />
          <Route path="/canciones/corneta/cornetin" element={<Corneta variant="cornetin" />} />
          <Route path="/canciones/internacional" element={<Internacional />} />
          <Route path="/audios" element={<Audios />} />
          <Route path="/lemas" element={<Lemas />} />
          <Route path="/lemas/:group" element={<LemasGroup />} />
          <Route path="/libro-de-visitas" element={<Libro />} />
          <Route path="/libro-de-visitas/firma/:id" element={<Firma />} />
          <Route path="/enlaces" element={<Enlaces />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/privacidad-cookies" element={<Privacy />} />
          {!IS_STATIC && <Route path="/admin" element={<Admin />} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CookieConsent />
      <PlayerBar />
      <Toaster
        theme="dark"
        position="bottom-right"
        offset={88}
        toastOptions={{
          style: { background: "#0f150f", border: "1px solid #3a4a36", color: "#F4F5F4", borderRadius: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ArchiveProvider>
          <PlayerProvider>
            <Shell />
          </PlayerProvider>
        </ArchiveProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
