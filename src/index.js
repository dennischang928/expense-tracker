// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";            // <-- REQUIRED
import { MantineProvider } from "@mantine/core";
import AppRouter from "./app/router";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="light">
      <AppRouter />
    </MantineProvider>
  </React.StrictMode>
);