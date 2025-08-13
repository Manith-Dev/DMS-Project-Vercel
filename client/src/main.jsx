import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewDocument from "./pages/NewDocument.jsx";
import EditDocument from "./pages/EditDocument.jsx";
import "./styles/index.css";
function App(){ return (<div className="min-h-screen flex flex-col font-kh"><NavBar/><main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6"><Routes><Route path="/" element={<Dashboard/>}/><Route path="/new" element={<NewDocument/>}/><Route path="/edit/:id" element={<EditDocument/>}/></Routes></main></div>); }
createRoot(document.getElementById("root")).render(<BrowserRouter><App/></BrowserRouter>);
