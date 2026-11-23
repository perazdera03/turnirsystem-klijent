<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { toast } from "vue3-toastify";
import { useRouter, useRoute } from "vue-router";
import FormContainer from "@/components/FormContainer.vue";
import { porukaGreske } from "@/utils/greske.js";

const router = useRouter();
const route = useRoute();
// id turnira iz adrese
const id = route.params.id;

// svako polje iz forme je jedna promenljiva
const naziv = ref("");
const opis = ref("");
const datumPocetka = ref("");
const datumZavrsetka = ref("");
const brojGrupa = ref(2);
const brojEkipaPoGrupi = ref(4);
const brojKvalifikovanih = ref(1);
const bodPobeda = ref(3);
const bodPoraz = ref(0);

// ucitava turnir i popunjava formu
const fetchTurnir = async () => {
  try {
    const response = await axios.get(`/api/Turniri/${id}`);
    naziv.value = response.data.naziv;
    opis.value = response.data.opis || "";
    datumPocetka.value = (response.data.datumPocetka || '').split('T')[0];
    datumZavrsetka.value = (response.data.datumZavrsetka || '').split('T')[0];
    brojGrupa.value = response.data.brojGrupa;
    brojEkipaPoGrupi.value = response.data.brojEkipaPoGrupi;
    brojKvalifikovanih.value = response.data.brojKvalifikovanih;
    bodPobeda.value = response.data.bodPobeda;
    bodPoraz.value = response.data.bodPoraz;
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri učitavanju turnira."));
  }
};

// salje izmenjen turnir na server
const handleSubmit = async (event) => {
  event.preventDefault();
  try {
    await axios.put(`/api/Turniri/${id}`, {
      naziv: naziv.value,
      opis: opis.value,
      datumPocetka: datumPocetka.value,
      datumZavrsetka: datumZavrsetka.value || null,
      brojGrupa: parseInt(brojGrupa.value),
      brojEkipaPoGrupi: parseInt(brojEkipaPoGrupi.value),
      brojKvalifikovanih: parseInt(brojKvalifikovanih.value),
      bodPobeda: parseInt(bodPobeda.value),
      bodPoraz: parseInt(bodPoraz.value),
    });
    router.push("/turniri").then(() => toast.success("Turnir uspešno izmenjen!"));
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri izmeni turnira."));
  }
};

// kad se stranica otvori ucitamo turnir
onMounted(() => {
  fetchTurnir();
});
</script>

<!-- izgled -->
<template>
  <FormContainer title="Izmena turnira">
    <!-- forma za izmenu turnira -->
    <form @submit="handleSubmit">
      <div class="mb-3">
        <label class="form-label">Naziv</label>
        <input type="text" v-model="naziv" class="form-control" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Opis</label>
        <textarea v-model="opis" class="form-control" rows="3"></textarea>
      </div>
      <div class="mb-3">
        <label class="form-label">Datum početka</label>
        <input type="date" v-model="datumPocetka" class="form-control" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Datum završetka (opciono)</label>
        <input type="date" v-model="datumZavrsetka" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label">Broj grupa</label>
        <input type="number" v-model="brojGrupa" class="form-control" min="1" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Najviše ekipa po grupi (kapacitet)</label>
        <input type="number" v-model="brojEkipaPoGrupi" class="form-control" min="2" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Broj kvalifikovanih po grupi</label>
        <input type="number" v-model="brojKvalifikovanih" class="form-control" min="1" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Bodovi za pobedu</label>
        <input type="number" v-model="bodPobeda" class="form-control" min="0" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Bodovi za poraz</label>
        <input type="number" v-model="bodPoraz" class="form-control" min="0" required />
      </div>
      <button type="submit" class="btn btn-primary">Sačuvaj</button>
      <button type="button" class="btn btn-secondary ms-2" @click="router.push('/turniri')">Otkaži</button>
    </form>
  </FormContainer>
</template>