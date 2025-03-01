document.addEventListener("DOMContentLoaded", function () {
  // Data structure for Week 1, Grade 6 Vocabulary
  const vocabulary = [
    { word: "wake", definition: "to stop sleeping (dejar de dormir)" },
    { word: "rise", definition: "to move upward (subir)" },
    { word: "brush", definition: "to clean with a brush (cepillar)" },
    { word: "teeth", definition: "hard structures in the mouth used for biting and chewing (dientes)" },
    { word: "white", definition: "the color of snow or milk (blanco)" },
    { word: "clothes", definition: "items worn to cover the body (ropa)" },
    { word: "shirt", definition: "a garment for the upper body (camisa)" },
    { word: "yellow", definition: "the color of a lemon or the sun (amarillo)" },
    { word: "pants", definition: "a garment for the lower body (pantalones)" },
    { word: "brown", definition: "the color of chocolate or wood (marrón)" },
    { word: "downstairs", definition: "to a lower floor (abajo)" },
    { word: "bowl", definition: "a round container (tazón)" },
    { word: "pour", definition: "to make a liquid flow (verter)" },
    { word: "cereal", definition: "a breakfast food made from grain (cereal)" },
    { word: "newspaper", definition: "printed pages with news (periódico)" }
  ];

  // Get the vocabulary content element
  const vocabularyContent = document.getElementById('vocabularyContent');
  if (vocabularyContent) {
    vocabularyContent.innerHTML = `
      <h3>Vocabulary</h3>
      ${vocabulary.map((item) => `<b>${item.word}</b> - ${item.definition}<br>`).join('')}
    `;
  }
});
