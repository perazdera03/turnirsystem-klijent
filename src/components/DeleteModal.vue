<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

//podaci koji roditelj (stranica?) salje modalu: naslov, poruka i funkcija koja se izvrsi kad se potrvrdi brisanje
const props = defineProps({
  title: {
    type: String,
    default: "Potvrda brisanja",
  },
  message: {
    type: String,
    default: "Da li ste sigurni da želite da obrišete stavku?",
  },
  onConfirm: {
    type: Function,
    required: true,
  },
});

//veza za html. pokazuje na modal iz template-a, da bi ga bootstrap mogao da otvori
const modalElement = ref(null);
let modalInstance = null;

//otvara se modal (poziva ga roditelj)
const showModal = () => {
  if (modalInstance) modalInstance.show();
};

//zatvara se modal
const hideModal = () => {
  if (modalInstance) modalInstance.hide();
};

//klik na "Obrisi". izvrsava se funkcija roditelja (brisanje), pa se zatvara modal
const handleConfirm = () => {
  props.onConfirm();
  hideModal();
};

//pravi se bootstrap modal kada se komponenta ucita na stranicu
onMounted(() => {
  modalInstance = new bootstrap.Modal(modalElement.value);
});

//kad se komponenta ukloni sa stranice, modal se unistava
onBeforeUnmount(() => {
  if (modalInstance) modalInstance.dispose();
});

//klik na "Obrisi". izvrsava se funkcija roditelja (brisanje), pa se zatvara modal
defineExpose({ showModal, hideModal });
</script>

<!-- izgled -->
<template>
  <div class="modal fade" ref="modalElement" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">{{ message }}</div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Otkaži</button>
          <button type="button" class="btn btn-danger" @click="handleConfirm">Obriši</button>
        </div>
      </div>
    </div>
  </div>
</template>