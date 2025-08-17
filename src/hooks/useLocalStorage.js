import { useState, useEffect } from "react";

export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (e) {
      console.error("Error reading localStorage", e);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      console.log("Saving to localStorage:", { key, value });
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Error saving to localStorage", e);
    }
  }, [key, value]);

  return [value, setValue];
}