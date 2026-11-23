<script setup>
import { ref } from "vue";
import axios from "axios";
import { toast } from "vue3-toastify";
import { useRouter } from "vue-router";
import FormContainer from "@/components/FormContainer.vue";
import { porukaGreske } from "@/utils/greske.js";

const router = useRouter();
//polja forme za novu ekipu
const naziv = ref("");
const skraceniNaziv = ref("");
const mesto = ref("");
const kontaktOsoba = ref("");
const logoUrl = ref("");

//slanje forme za novu ekipu
const handleSubmit = async (event) => {
  event.preventDefault();
  try {
    await axios.post("/api/Ekipe", {
      naziv: naziv.value,
      skraceniNaziv: skraceniNaziv.value,
      mesto: mesto.value,
      kontaktOsoba: kontaktOsoba.value,
      logoUrl: logoUrl.value || null, //opcioni podatak, moze biti prazno(null)
    });
    //kad se napravi nova ekipa, vraca se na listu ekipa
    router.push("/ekipe").then(() => toast.success("Ekipa uspešno dodata!"));
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri dodavanju ekipe.")); //greska ako ne uspe
  }
};
</script>

<!-- izgled -->
<template>
  <FormContainer title="Nova ekipa">
    <form @submit="handleSubmit">
      <div class="mb-3">
        <label class="form-label">Naziv</label>
        <input type="text" v-model="naziv" class="form-control" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Skraćeni naziv</label>
        <input type="text" v-model="skraceniNaziv" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label">Mesto</label>
        <input type="text" v-model="mesto" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label">Kontakt osoba</label>
        <input type="text" v-model="kontaktOsoba" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label">Logo (adresa slike, opciono)</label>
        <input type="text" v-model="logoUrl" class="form-control" placeholder="https://..." />
        <img
          v-if="logoUrl"
          :src="logoUrl"
          alt="Pregled loga"
          class="mt-2"
          style="height: 64px; max-width: 100%; object-fit: contain;"
          @error="(e) => (e.target.style.display = 'none')"
          @load="(e) => (e.target.style.display = '')"
        />
      </div>
      <button type="submit" class="btn btn-primary">Sačuvaj</button>
      <button type="button" class="btn btn-secondary ms-2" @click="router.push('/ekipe')">Otkaži</button>
    </form>
  </FormContainer>
</template>