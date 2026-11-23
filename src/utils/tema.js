import { ref } from "vue";

//kljuc pod kojim se tema light ili dark mode pamti u browser
const KLJUC = "tema";

//cita trenutnu temu iz localstorage. ako ne radi localstorage, try and catch vraca light mode.
const procitaj = () => {
  try {
    return localStorage.getItem(KLJUC) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

//koja je trenutna tema
export const tema = ref(procitaj());

//upisuje se tema u html kako bi je bootstrap primenio
export const primeniTemu = () => {
  document.documentElement.setAttribute("data-bs-theme", tema.value);
};

//menja izmedju light i dark mode. pamti izbor u buduce
export const promeniTemu = () => {
  tema.value = tema.value === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(KLJUC, tema.value);
  } catch {
  }
  primeniTemu();
};
