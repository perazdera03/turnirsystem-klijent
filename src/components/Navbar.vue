<script setup>
import { RouterLink, useRouter } from "vue-router";
import { toast } from "vue3-toastify";
import { prijavljen, osveziPrijavu } from "@/utils/auth.js";
import { tema, promeniTemu } from "@/utils/tema.js";
import { pismo, promeniPismo } from "@/utils/pismo.js";

const router = useRouter();

//odjava. brise se token, rola i vreme isteka iz local storage. tada ce se osveziti stanje prijave i vraca korisnika na pocetnu stranicu
const handleLogout = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("rola");
  localStorage.removeItem("token_istice");
  osveziPrijavu();
  router.push("/").then(() => toast.success("Uspešno ste se odjavili."));
};
</script>

<!-- izgled -->
<template>
  <nav class="navbar navbar-expand-lg navbar-dark navbar-tema">
    <div class="container-fluid navbar-red">
      <div class="navbar-levo">
        <RouterLink class="navbar-brand" to="/">🎮 Turnir System</RouterLink>
      </div>

      <ul class="navbar-nav flex-row gap-3 navbar-sredina">
        <li class="nav-item">
          <RouterLink class="nav-link" to="/">Početna</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink class="nav-link" to="/ekipe">Ekipe</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink class="nav-link" to="/turniri">Turniri</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink class="nav-link" to="/raspored">Raspored</RouterLink>
        </li>
      </ul>

      <div class="navbar-desno">
        <button
          class="btn btn-outline-light btn-sm"
          data-bez-pisma
          @click="promeniPismo"
          :title="pismo === 'cir' ? 'Пребаци на латиницу' : 'Пребаци на ћирилицу'"
          aria-label="Promena pisma"
        >{{ pismo === 'cir' ? 'Lat' : 'Ћир' }}</button>
        <button
          class="btn btn-outline-light btn-sm"
          @click="promeniTemu"
          :title="tema === 'dark' ? 'Prebaci na svetlu temu' : 'Prebaci na tamnu temu'"
          aria-label="Promena teme"
        >{{ tema === 'dark' ? '☀️' : '🌙' }}</button>
        <button v-if="prijavljen" class="btn btn-danger btn-sm" @click="handleLogout">Odjavi se</button>
        <RouterLink v-else class="btn btn-outline-light btn-sm" to="/login">Prijava</RouterLink>
      </div>
    </div>
  </nav>
</template>

<!-- izgled-->
<style scoped>
/* Logo levo, linkovi u sredini, dugmad desno */
.navbar-red {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.navbar-sredina {
  margin: 0;
}

.navbar-desno {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 767px) {
  .navbar-red {
    grid-template-columns: 1fr;
    row-gap: 0.5rem;
    justify-items: center;
  }

  .navbar-desno {
    justify-content: center;
  }
}
</style>
