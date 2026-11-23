<script setup>
import { RouterLink } from "vue-router";

//okvir za tabelu. stranica salje link,tekst dugmeta i da li se dugme prikazuje, dok se zaglavlje i redove tabele ubacuje u dva slota(to je prazno mesto koje stranica puni svojim sadrzajem)
const props = defineProps({
  to: {
    type: String,
    required: true,
  },
  buttonText: {
    type: String,
    required: true,
  },
  showButton: {
    type: Boolean,
    default: true,
  },
});
</script>

<!-- izgled -->
<template>
  <div class="container mt-4">
    <div class="row">
      <div class="mb-3">
        <RouterLink v-if="showButton" :to="to" role="button" class="btn btn-primary">
          {{ buttonText }}
        </RouterLink>
      </div>
      <div class="row">
        <table class="table table-striped table-bordered">
          <thead class="table-dark">
            <slot name="table-header"></slot>
          </thead>
          <tbody>
            <slot name="table-body"></slot>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>