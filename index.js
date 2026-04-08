import express from "express";
import https from "https";
import fs from "fs";
import { Server } from "socket.io";
import fetch from "node-fetch";
import FormData from "form-data";


const app = express();


const options = {
  key: fs.readFileSync("key.pem"),   // chave privada
  cert: fs.readFileSync("cert.pem")  // certificado público
};

const PORT = 8443; 
const server = https.createServer(options, app);


const io = new Server(server, {
  cors: { origin: "*" }
});


const username = "carloslacerda";
const password = "Exitexit@02";
const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");


const MAPA_TECNICOS = {
  "Emerson Barbosa dos Santos Alves": "Emerson",
  "Nelson": "Nelson",
  "alexsilva": "Alex",
  "paulinosantos": "Paulino",
  "Fernando Caitano Martins": "Fernando",
  "ramonalmeida": "Ramon",
  "Claudinei": "Claudinei",
  "LUCIO": "Lucio",
};


async function buscarAgenda(dataFiltro) {
  try {
    const date = dataFiltro;
    console.log("🔄 Buscando API para a data:", date);

    const formData0 = new FormData();
    formData0.append("status", "0");
    formData0.append("data_agendamento_inicio", date);
    formData0.append("data_agendamento_fim", date);

    const formData1 = new FormData();
    formData1.append("status", "1");
    formData1.append("data_finalizacao_inicio", date);
    formData1.append("data_finalizacao_fim", date);
    formData1.append("data_agendamento_inicio", date);
    formData0.append("data_agendamento_fim", date);

    const formData2 = new FormData();
    formData2.append("status", "2");
    formData2.append("data_agendamento_inicio", date);
    formData0.append("data_agendamento_fim", date);

    const [res0, res1, res2] = await Promise.all([
      fetch("https://acessanet.sgp.net.br/api/ura/ordemservico/list/", {
        method: "POST",
        headers: { "Authorization": `Basic ${basicAuth}` },
        body: formData0
      }),
      fetch("https://acessanet.sgp.net.br/api/ura/ordemservico/list/", {
        method: "POST",
        headers: { "Authorization": `Basic ${basicAuth}` },
        body: formData1
      }),
      fetch("https://acessanet.sgp.net.br/api/ura/ordemservico/list/", {
        method: "POST",
        headers: { "Authorization": `Basic ${basicAuth}` },
        body: formData2
      })
    ]);

    const [data0, data1, data2] = await Promise.all([res0.json(), res1.json(), res2.json()]);

    const todasOS = [
      ...(data0.ordens_servicos || []),
      ...(data1.ordens_servicos || []),
      ...(data2.ordens_servicos || [])
    ];

    const agenda = todasOS
      .filter(os => MAPA_TECNICOS[os.responsavel])
      .map(os => ({
        tecnico: MAPA_TECNICOS[os.responsavel],
        motivo: os.motivo,
        idCliente: os.contrato,
        cliente: os.cliente,
        status: os.status,
        pop: os.pop,
        hora: os.hora_agendamento,
        data_finalizado: os.hora_finalizacao,
        Checkin: os.Checkin
      }));

    console.log(`✅ ${agenda.length} OS encontradas para ${date}`);
    return agenda;

  } catch (err) {
    console.error("🔥 Erro:", err);
    return [];
  }
}


io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado");

  socket.on("filtrarData", async (dataSelecionada) => {
    if (!dataSelecionada) return;
    const agenda = await buscarAgenda(dataSelecionada);
    socket.emit("agenda", agenda);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado");
  });
});


app.use(express.static("public"));


server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor HTTPS interno rodando na porta: ${PORT}`);
});