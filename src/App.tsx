import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import Story from "@/pages/Story";
import Photos from "@/pages/Photos";
import Video from "@/pages/Video";
import Timeline from "@/pages/Timeline";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/story" element={<Story />} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/video" element={<Video />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}
