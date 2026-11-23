import { createApp } from "vue";
import App from "./App.vue";
import Vue3Toastify, { toast } from "vue3-toastify";
import "vue3-toastify/dist/index.css";
import router from "./router";
import axios from "axios";
import "./assets/tema.css";
import { primeniTemu } from "./utils/tema.js";
import { inicijalizujPismo } from "./utils/pismo.js";

//brise podatke o prijavi iz browsera
const odjavi = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("rola");
  localStorage.removeItem("token_istice");
};

//proverava da li je vreme trajanja tokena isteklo
const sesijaIstekla = () => {
  const istice = parseInt(localStorage.getItem("token_istice") || "0");
  return istice > 0 && Date.now() > istice;
};

//pre svakog zahteva serveru, token se dodaje u zaglavlje kako bi server znao da smo prijavljeni. dodaje se samo ako sesija jos traje
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && !sesijaIstekla()) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

//ako je token istekao, korisnik se vraca na login stranicu.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const jeLogin = error.config?.url?.includes("/api/Auth/login"); //jedini izuzetak ako je pogresna lozinka, tad nas ne vraca na login stranicu jer smo vec tu
    if (error.response?.status === 401 && !jeLogin) {
      odjavi();
      if (router.currentRoute.value.path !== "/login") {
        router.push("/login").then(() => toast.error("Sesija je istekla. Prijavi se ponovo."));
      }
    }
    return Promise.reject(error);
  }
);

//tamna ili svetla tema stranice
primeniTemu();

const app = createApp(App);

//toast poruka. sluzi kao obavestenje i traje 3 sekunde
app.use(Vue3Toastify, {
  autoClose: 3000,
});

app.use(router);
app.mount("#app");

//pismo da li hocemo cirilicu ili latinicu
inicijalizujPismo();