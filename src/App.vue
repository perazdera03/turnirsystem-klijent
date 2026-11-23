<script setup>
import { RouterView } from "vue-router";
import Navbar from "./components/Navbar.vue";
</script>

<!-- izgled -->
<template>
  <div>
    <!-- meni je uvek na vrhu, a RouterView prikazuje stranicu koja odgovara adresi -->
    <Navbar />
    <RouterView />
  </div>
</template>