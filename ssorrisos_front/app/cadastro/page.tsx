"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CadastroPage() {

  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");

  const handleSubmit = async (e:any) => {
    e.preventDefault();

    try {

      const res = await fetch("http://127.0.0.1:8000/api/cadastro/",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          username,
          email,
          password
        })
      });

      const data = await res.json();

      if(!res.ok){
        setErro(data.error || "Erro ao cadastrar");
        return;
      }

      router.push("/login");

    } catch(err){
      setErro("Erro no servidor");
    }

  }

  return (

    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow w-96 space-y-4"
      >

        <h1 className="text-xl font-bold">
          Criar Conta
        </h1>

        {erro && (
          <p className="text-red-500 text-sm">
            {erro}
          </p>
        )}

        <input
          type="text"
          placeholder="Username"
          className="w-full border p-2 rounded"
          value={username}
          onChange={(e)=>setUsername(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 rounded"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          Cadastrar
        </button>

      </form>

    </div>

  );

}