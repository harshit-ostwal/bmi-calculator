function loadFeatures() {
  const Features = [
    {
      title: "Smart Unit Conversion",
      description:
        "Effortlessly switch between metric and imperial units for weight and height, making it easy to use no matter where you are in the world.",
    },
    {
      title: "Accurate BMI Calculation",
      description:
        "Our calculator uses the standard BMI formula to provide accurate results based on your weight and height inputs, ensuring you get reliable insights into your health.",
    },
    {
      title: "Instant Calculations",
      description:
        "Get your BMI calculated in real-time as you input your weight and height, providing immediate feedback on your health status.",
    },
    {
      title: "Health Insights",
      description:
        "Receive personalized insights based on your BMI, including health recommendations and tips for maintaining a healthy lifestyle.",
    },
    {
      title: "History Tracking",
      description:
        "Keep track of your BMI history with our built-in tracking feature, allowing you to monitor your progress over time.",
    },
    {
      title: "User-Friendly Interface",
      description:
        "Enjoy a clean and intuitive design that makes it easy for anyone to use the BMI calculator without any hassle.",
    },
  ];

  const featureCards = document.getElementById("feature-cards");

  let card = "";

  Features.forEach((feature) => {
    card += `
<div class="feature-card">
            <h3>${feature.title}</h3>
            <p>
              ${feature.description}
            </p>
            <div class="blob-card"></div>
          </div>
    `;
  });

  featureCards.innerHTML = card;
}

function loadBMICategories() {
  const BMICategories = [
    {
      category: "Underweight",
      range: "BMI < 18.5",
      color: "#f39c12",
    },
    {
      category: "Normal weight",
      range: "18.5 ≤ BMI < 24.9",
      color: "#27ae60",
    },
    {
      category: "Overweight",
      range: "25 ≤ BMI < 29.9",
      color: "#e67e22",
    },
    {
      category: "Obesity",
      range: "BMI ≥ 30",
      color: "#c0392b",
    },
  ];

  const bmiCategories = document.getElementById("bmi-categories");

  let categoryCards = "";

  BMICategories.forEach((bmiCategory) => {
    categoryCards += `
    <div class="bmi-category">
      <div class="content">
      <h4>${bmiCategory.category}</h4>
      <p>${bmiCategory.range}</p>
      </div>
      <div class="circle" style="background: ${bmiCategory.color}"></div>
    </div>
    `;
  });

  bmiCategories.innerHTML = categoryCards;
}

loadFeatures();
loadBMICategories();
