// src/components/Layout.js
import React, { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShell, Header, Tabs, Container, Text } from "@mantine/core";

import useLocalStorage from "../hooks/useLocalStorage";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useLocalStorage("expenses", []);
  const addExpense = ((e) => {
    setExpenses((prev) => [...prev, e])
    console.log("Adding Expense:", e)
  })
  
  const importRows = (rows) => {
    setExpenses((prev) => [...prev, ...rows]);
    console.log("Importing rows:", rows);
  }
  const updateExpenses = (newExpenses) => setExpenses(newExpenses);

  // Determine which tab is active based on the current route
  const current = useMemo(() => {
    if (location.pathname.startsWith("/import")) return "import";
    if (location.pathname.startsWith("/dashboard")) return "dashboard";
    return "add";
  }, [location.pathname]);

  const handleTabChange = (value) => {
    if (value === "add") navigate("/");
    else navigate(`/${value}`);
  };

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Container
          size="lg"
          style={{ display: "flex", alignItems: "center", height: "100%" }}
        >
          <Text 
            fw={700} 
            mr="auto" 
            style={{
              fontSize: '1.5rem',
              background: 'linear-gradient(45deg, #FF4B00, #00AEEF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 20px rgba(0, 174, 239, 0.3)'
            }}
          >
            IndustrialFin
          </Text>
          <Tabs value={current} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Tab value="add">Add Expense</Tabs.Tab>
              <Tabs.Tab value="import">Bulk Import</Tabs.Tab>
              <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg" py="md">
          <Outlet context={{ expenses, addExpense, importRows, updateExpenses }} />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}