import { createRouter, createWebHistory } from "vue-router";
import { toast } from "vue3-toastify";
import { jePrijavljen, osveziPrijavu } from "@/utils/auth.js";
import Login from "@/views/Login.vue";
import Ekipe from "@/views/Ekipe.vue";
import EkipeNovi from "@/views/EkipeNovi.vue";
import EkipeIzmena from "@/views/EkipeIzmena.vue";
import Turniri from "@/views/Turniri.vue";
import TurniriNovi from "@/views/TurniriNovi.vue";
import TurniriIzmena from "@/views/TurniriIzmena.vue";
import TurnirDetalji from "@/views/TurnirDetalji.vue";
import KontrolnaTabla from "@/views/KontrolnaTabla.vue";
import TurnirStatistika from "@/views/TurnirStatistika.vue";
import EkipaIstorija from "@/views/EkipaIstorija.vue";
import Raspored from "@/views/Raspored.vue";

//sve rute stranica. rute koje imaju requiresauth:true moze samo admin pristupiti
const routes = [
  { path: "/", name: "KontrolnaTabla", component: KontrolnaTabla },
  { path: "/login", name: "Login", component: Login },

  { path: "/turniri", name: "Turniri", component: Turniri },
  { path: "/turniri/:id", name: "TurnirDetalji", component: TurnirDetalji },
  { path: "/turniri/:id/statistika", name: "TurnirStatistika", component: TurnirStatistika },
  { path: "/raspored", name: "Raspored", component: Raspored },
  { path: "/ekipe", name: "Ekipe", component: Ekipe },
  { path: "/ekipe/:id/istorija", name: "EkipaIstorija", component: EkipaIstorija },

  { path: "/ekipe-novi", name: "EkipeNovi", component: EkipeNovi, meta: { requiresAuth: true } },
  { path: "/ekipe-izmena/:id", name: "EkipeIzmena", component: EkipeIzmena, meta: { requiresAuth: true } },
  { path: "/turniri-novi", name: "TurniriNovi", component: TurniriNovi, meta: { requiresAuth: true } },
  { path: "/turniri-izmena/:id", name: "TurniriIzmena", component: TurniriIzmena, meta: { requiresAuth: true } },
];

const router = createRouter({ //pravi ruter sa spiskom ruta iznad. ruter prebacuje stranice kad se promeni adresa
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

//pre nego sto se otvori ruta, proverava da li je korisnik prijavljen. ako je sesija istekla (ili nije prijavljen), vraca ga na login
router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true;
  if (jePrijavljen()) return true;

  if (localStorage.getItem("access_token")) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("rola");
    localStorage.removeItem("token_istice");
    toast.error("Sesija je istekla. Prijavi se ponovo.");
  }
  return "/login";
});

//na svaku rutu osvezava se prikaz da li je admin ulogovan
router.afterEach(() => {
  osveziPrijavu();
});

export default router;