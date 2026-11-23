<script setup>
//okvir za forme. naslov salje stranica odakle je okvir pozvan, a sama forma ide u slot(to je prazno mesto koja stranicu puni svojim sadrzajem)
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});
</script>

<!-- izgled -->
<template>
  <div class="container mt-4">
    <div class="row">
      <div class="col-lg-6 col-12">
        <div class="my-4">
          <h3>{{ title }}</h3>
        </div>
        <slot></slot>
      </div>
    </div>
  </div>
</template>