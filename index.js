var host = 'http://tspv.sungeunchoi.com:8080';

var camera, scene, renderer, controls;
var lblCurrentT = null;
var lblCurrentDistance = null;
var lblCitiesCt = null;
var lblToursCt = null;

window.addEventListener('load', async function() {
    loadUIComponents();
    initializeThreeJsEnvironment();

    let model = await loadModel();
    console.log("Loaded model: %O", model);

    let state = {
        currentTourIndex: 0,
        line: null 
    };

    // setup the scene using the model (drawing cities, etc)
    setupScene(model);

    // setup the diagnostic panel labels.
    lblCitiesCt.text(model.cities.length);
    lblToursCt.text(model.tours.length);

    setInterval(() => modifyState(state, model), 100);

    animate();
    render();
});

function loadUIComponents() {
    lblCitiesCt = $('#lbl-cities-ct');
    lblToursCt = $('#lbl-tours-ct');
    lblCurrentT = $('#lbl-current-t');
    lblCurrentDistance = $('#lbl-current-dist');
}

/**
 * Initialize the camera, scene, renderer, and controls.
 * For better or for worse, they are set globally.
 */
function initializeThreeJsEnvironment() {
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
    //camera = new THREE.PerspectiveCamera(70, viewportAspect, 0.01, 10);
    camera.position.z = 1.4;

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    let c = document.getElementById('canvas3d');
    c.appendChild(renderer.domElement);

    controls = new THREE.TrackballControls(camera);
    controls.addEventListener('change', render);
}

function setupScene(model) {
    let geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);

    let wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x22222233, linewidth: 1 }));

    wireframe.rotation.x += 45;
    wireframe.rotation.y += 45;
    wireframe.rotation.z += 45;
    scene.add(wireframe);

    // Draw the cities.
    model.cities.forEach(p => {
        var point = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.01, 0.01),
            new THREE.MeshNormalMaterial());
        
        point.position.x = p[0] || 0.0;
        point.position.y = p[1] || 0.0;
        point.position.z = p[2] || 0.0;

        scene.add(point);
    });
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}

async function loadModel() {
    let data = await $.ajax(host + "/data/cities/helix-100-3d.csv");
    let cities = normalizeCitiesLocations(decodeCitiesData(data));
    let tours_raw = await $.ajax(host + "/data/tours/helix-100-3d-tour.csv");

    // tours_raw data format: min;max;[1,2,...,n]
    let tours = decodeTourData(tours_raw);
    return {cities, tours};
}

let lineMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5
});
function modifyState(state, model) {
    state.currentTourIndex += 1;
    if (state.currentTourIndex >= model.tours.length) {
        state.currentTourIndex = 0;
    }

    if (state.line == null) {
        let g = new THREE.Geometry();
        modifyLineGeometry(g, model.tours[0], model.cities);
        g.dynamic = true;

        state.line = new THREE.Line(g, lineMaterial);
        scene.add(state.line);
    }

    let currentTour = model.tours[state.currentTourIndex];

    modifyLineGeometry(
        state.line.geometry,
        currentTour,
        model.cities
    );

    lblCurrentT.text(state.currentTourIndex + ' / ' + model.tours.length);
    lblCurrentDistance.text(currentTour.distance);

    render();
}

/**
 * @param g
 * @param tour
 * @param cities
 */
function modifyLineGeometry(g, tour, cities) {
    let home = cities[tour[0]];
    for (var i=0; i<tour.length; ++i) {
        var i_city = tour[i];
        if (g.vertices[i] == null)
            g.vertices[i] = new THREE.Vector3();

        g.vertices[i].x = cities[i_city][0];
        g.vertices[i].y = cities[i_city][1];
        g.vertices[i].z = cities[i_city][2];
    }

    g.vertices[i] = new THREE.Vector3(home[0], home[1], home[2]);
    g.verticesNeedUpdate = true;
}

/**
 * @param citiesData Raw string of cities index and location data.
 */
function decodeCitiesData(citiesData) {
    var cities = [];
    citiesData.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (line === "") {
            return;
        }

        var tokens = line.split(' ');
        var no = tokens[0];
        var coord = tokens.slice(1);

        coord = coord.map(v => Number(v));

        if (coord.length == 2) {
            coord.push(0.0);
        }

        cities[no] = coord;
    });

    return cities;
}

function normalizeCitiesLocations(cities) {
    function calculateComponentStats(componentIndex, cities) {
        let max = cities.reduce((currentMax, coordinate) => {
            if (coordinate[componentIndex] > currentMax)
                return coordinate[componentIndex];
            else
                return currentMax;
        }, 0);

        let min = cities.reduce((currentMin, coordinate) => {
            if (coordinate[componentIndex] < currentMin)
                return coordinate[componentIndex];
            else
                return currentMin;
        }, Number.MAX_VALUE);

        return {max: max, min: min, avg: (max+min)/2.0, delta: max-min};
    }

    var xstats = calculateComponentStats(0, cities);
    var ystats = calculateComponentStats(1, cities);
    var zstats = calculateComponentStats(2, cities);
    var center = [xstats.avg, ystats.avg, zstats.avg];
    //var dM = Math.max(xstats.delta, ystats.delta, zstats.delta);

    cities.map(p => {
        p[0] -= center[0];
        p[1] -= center[1];
        p[2] -= center[2];

        p[0] /= xstats.delta;
        p[1] /= ystats.delta;
        p[2] /= zstats.delta;

        return p;
    });

    return cities;
}

function decodeTourData(data) {
    let tours = [];
    data.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (line === "" || line == null) {
            return;
        }

        let tokens = line.split(';');
        let distance = JSON.parse(tokens[0]);
        let tour = JSON.parse(tokens[2]);

        tour.distance = distance;
        tours.push(tour);
    });

    return tours;
}
