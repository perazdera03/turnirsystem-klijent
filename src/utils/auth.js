import { ref } from "vue";

//vraca true ako postoji token koji jos nije istekao, inace false ako jeste
export const jePrijavljen = () => {
  const token = localStorage.getItem("access_token");
  if (!token) return false;
  const istice = parseInt(localStorage.getItem("token_istice") || "0");
  if (istice > 0 && Date.now() > istice) return false;
  return true;
};

//dinamicka vrednost. navbar i dugmad se sami menjaju na osnovu da li si admin ili gledaoc
export const prijavljen = ref(jePrijavljen());

//opet proverava prijavu i upisuje u prijavljen
export const osveziPrijavu = () => {
  prijavljen.value = jePrijavljen();
};