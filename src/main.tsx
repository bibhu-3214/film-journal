import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AccountWorkspaceGate from "./platform/AccountWorkspaceGate";
import FilmJournal from "./features/journal/FilmJournal";
import { filmSchema, type FilmRecord } from "./features/journal/model";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AccountWorkspaceGate<FilmRecord> schema={filmSchema}>
        {(state) => <FilmJournal state={state} />}
      </AccountWorkspaceGate>
    </BrowserRouter>
  </React.StrictMode>,
);
