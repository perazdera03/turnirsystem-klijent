<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { toast } from "vue3-toastify";
import { osveziPrijavu } from "@/utils/auth.js";

//podaci koje admin unosi u formu
const username = ref("");
const password = ref("");
const router = useRouter();

//iz forme se salje korisnicko ime i lozinku serveru
const handleSubmit = async (event) => {
  event.preventDefault();
  try {
    const response = await axios.post("/api/Auth/login", {
      username: username.value,
      password: password.value,
    });
    //cuva se token u browseru sa rolom i istek tokena. traje 120 minuta
    localStorage.setItem("access_token", response.data.access_token);
    localStorage.setItem("rola", "Admin");
    localStorage.setItem("token_istice", String(Date.now() + 120 * 60 * 1000));
    osveziPrijavu();
    router.push("/").then(() => toast.success("Uspešno ste se prijavili!"));
    //daje gresku ako je pogresno ime ili lozinka. ako server ne radi, i dalje ce prikazati gresku.
  } catch (error) {
    toast.error(error.response?.data?.message || "Pogrešno korisničko ime ili lozinka.");
  }
};
</script>


<!-- izgled -->
<template>
  <div class="container">
    <div class="row justify-content-center mt-5">
      <div class="col-lg-4 col-12">
        <h2 class="text-center mb-4">🎮 Turnir System</h2>
        <form @submit="handleSubmit">
          <div class="form-group mb-3">
            <label>Korisničko ime</label>
            <input type="text" v-model="username" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Lozinka</label>
            <input type="password" v-model="password" class="form-control" required />
          </div>
          <button type="submit" class="btn btn-primary w-100">Prijavi se</button>
        </form>
      </div>
    </div>
  </div>
</template>