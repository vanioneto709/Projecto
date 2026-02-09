"use client";

import { useEffect } from "react";
import { api } from "../services/api";

export default function Home() {
  useEffect(() => {
    api.get("test/")  // chama http://127.0.0.1:8000/api/test/
      .then(res => console.log("API OK:", res.data))
      .catch(err => console.error("API ERRO:", err));
  }, []);

  return <h1>Next + Django: teste de integração</h1>;
}
