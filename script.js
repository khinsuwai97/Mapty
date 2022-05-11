'use strict';

class Workout {
  date = new Date();
  id = String(Date.now()).slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //lat,lng
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.desciption = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadance) {
    super(coords, distance, duration);
    this.cadance = cadance;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance; //min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); //km/hr
    return this.speed;
  }
}

// const run1 = new Running([23, 34], 23, 34, 123);
// const cycling = new Cycling([23, 34], 23, 34, 123);
// console.log(run1, cycling);
/////////////////////////////////////////////////////////////////////////////
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const overlay = document.querySelector('.overlay');
const errorWindow = document.querySelector('.error--window');
const btnClose = document.querySelector('.btn--close');
const btnSort = document.querySelector('.btn--sort');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;

  #workouts = [];
  #sorted = false;

  constructor() {
    this._getPosition();
    this._getLocalStorage();

    // Event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    btnClose.addEventListener('click', this._closeError.bind(this));
    overlay.addEventListener('click', this._closeError.bind(this));
    btnSort.addEventListener('click', this._sortDistance.bind(this));
    containerWorkouts.addEventListener('click', this._deletWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Couldn't get your location");
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Clear input fileds
    inputDistance.value =
      inputElevation.value =
      inputCadence.value =
      inputDuration.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const dataValidation = (...input) =>
      input.every(inp => Number.isFinite(inp));
    const allPositive = (...input) => input.every(inp => inp > 0);

    const showError = function () {
      errorWindow.classList.remove('hidden');
      overlay.classList.remove('hidden');
    };

    //  get information from userinput
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // if workout is running, create running object;
    if (type === 'running') {
      const cadance = +inputCadence.value;
      // check data is valid;
      if (
        !dataValidation(distance, duration, cadance) ||
        !allPositive(distance, duration, cadance)
      )
        return showError();

      workout = new Running([lat, lng], distance, duration, cadance);
    }
    // if workout is cycling, create cycling objct;
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // check data is valid;
      if (
        !dataValidation(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return showError();

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to workout array
    this.#workouts.push(workout);

    // render marker on map
    this._renderWorkoutMarker(workout);

    // render workout in list
    this._renderWorkout(workout);

    // hide form
    this._hideForm();

    // store data in local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.desciption}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
  
    
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <svg xmlns="http://www.w3.org/2000/svg" class="cross-icon btn--cross" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"      clip-rule="evenodd" />
          </svg>
          <h2 class="workout__title">${workout.desciption}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
            
          </div>
         
    `;

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadance}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //using publice interface
    // workout.click();
  }

  _closeError() {
    errorWindow.classList.add('hidden');
    overlay.classList.add('hidden');
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _sortDistance() {
    this.#workouts = JSON.parse(localStorage.getItem('workouts'));
    this.#workouts = this.#workouts.sort((a, b) => a.distance - b.distance);
    console.log(this.#workouts);

    this.#sorted = !this.#sorted;

    this._setLocalStorage();
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _deletWorkout(e) {
    const btnDelete = e.target.closest('.btn--cross');
    if (!btnDelete) return;
    const workoutel = e.target.closest('.workout');

    if (!workoutel) return;
    this.#workouts = JSON.parse(localStorage.getItem('workouts'));
    const index = this.#workouts.findIndex(
      el => el.id === workoutel.dataset.id
    );
    workoutel.remove();
    this.#workouts.splice(index, 1);
    this._setLocalStorage();
  }
}

const app = new App();
