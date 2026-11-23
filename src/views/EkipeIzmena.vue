<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { toast } from "vue3-toastify";
import { useRouter, useRoute } from "vue-router";
import FormContainer from "@/components/FormContainer.vue";
import { porukaGreske } from "@/utils/greske.js";

const router = useRouter();
const route = useRoute();
//id ekipe iz adrese
const id = route.params.id;

//polja forme za izmenu ekipe. isto je kao za ekipanovi
const naziv = ref("");
const skraceniNaziv = ref("");
const mesto = ref("");
const kontaktOsoba = ref("");
const logoUrl = ref("");

//ucitava se postojeca ekipa za popunjavanje forme.
const fetchEkipa = async () => { //u slucaju da je podatak u bazi prazan(null), u formu ide prazan tekst
  try {
    const response = await axios.get(`/api/Ekipe/${id}`);
    naziv.value = response.data.naziv;
    skraceniNaziv.value = response.data.skraceniNaziv || "";
    mesto.value = response.data.mesto || "";
    kontaktOsoba.value = response.data.kontaktOsoba || "";
    logoUrl.value = response.data.logoUrl || "";
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri učitavanju ekipe."));
  }
};

//slanje forme za izmenu ekipe
const handleSubmit = async (event) => {
  event.preventDefault();
  try {
    await axios.put(`/api/Ekipe/${id}`, {
      naziv: naziv.value,
      skraceniNaziv: skraceniNaziv.value,
      mesto: mesto.value,
      kontaktOsoba: kontaktOsoba.value,
      logoUrl: logoUrl.value || null, //opcioni podatak, moze biti prazno(null)
    });
    router.push("/ekipe").then(() => toast.success("Ekipa uspešno izmenjena!")); //kad se izmene podaci ekipe, vraca se na listu ekipa
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri izmeni ekipe.")); //greska ako ne uspe
  }
};

//ekipa se ucitava cim se stranica otvori
onMounted(() => {
  fetchEkipa();
});
</script>

<!-- izgled -->
<template>
  <FormContainer title="Izmena ekipe">
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