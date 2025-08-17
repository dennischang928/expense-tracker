import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "../components/Layout";
import ExpenseForm from "../features/expenses/components/ExpenseForm";
import BulkImport from "../features/expenses/components/BulkImport";
import Dashboard from "../features/dashboard/Dashboard";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <ExpenseForm /> },
      { path: "import", element: <BulkImport /> },
      { path: "dashboard", element: <Dashboard /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}