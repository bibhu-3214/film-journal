import WorkspaceLoading from "./platform/WorkspaceLoading";
import WorkspaceBoundary from "./platform/WorkspaceBoundary";
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AccountWorkspaceGate from "./platform/AccountWorkspaceGate";
const FilmJournal = lazy(() => import("./features/journal/FilmJournal"));
import { filmSchema, type FilmRecord } from "./features/journal/model";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WorkspaceBoundary>
        <AccountWorkspaceGate<FilmRecord> schema={filmSchema}>
          {(state) => (
            <Suspense fallback={<WorkspaceLoading />}>
              <FilmJournal state={state} />
            </Suspense>
          )}
        </AccountWorkspaceGate>
      </WorkspaceBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);
