import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import NavBar from "./components/NavBar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewDocument from "./pages/NewDocument.jsx";
import EditDocument from "./pages/EditDocument.jsx";
import Process from "./pages/Process.jsx";      // NEW (if you created it)
import Dispatch from "./pages/Dispatch.jsx";    // NEW (if you created it)
import Timeline from "./pages/Timeline.jsx";    // <-- IMPORT THIS

import "./styles/index.css";

function App(){
  return (
    <div className="min-h-screen flex flex-col font-kh">
      <NavBar/>
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Dashboard/>}/>
          <Route path="/new" element={<NewDocument/>}/>
          <Route path="/edit/:id" element={<EditDocument/>}/>
          <Route path="/process" element={<Process/>}/>
           <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/timeline/:id" element={<Timeline/>}/> {/* <-- NOW DEFINED */}
        </Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter><App/></BrowserRouter>
);
