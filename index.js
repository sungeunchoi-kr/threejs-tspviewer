var camera, scene, renderer, controls;
var geometry, material, mesh;

var model = {
    cities: [],
    path: []
};

window.addEventListener('load', function() {
    init();
    loadData();
    animate();
    render();
});

function init() {
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
    camera.position.z = 1.4;

    scene = new THREE.Scene();

    geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    material = new THREE.MeshNormalMaterial();

    var wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x22222233, linewidth: 1 }));

    //mesh = new THREE.Mesh(geometry, material);
    wireframe.rotation.x += 45;
    wireframe.rotation.y += 45;
    wireframe.rotation.z += 45;
    scene.add(wireframe);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.TrackballControls(camera);
    controls.addEventListener('change', render);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}

function loadData() {
    $.get(
        "http://localhost:8089/data/cities/djibouti-38.csv",
        {},
        function(data) {
            model.cities = normalizeCitiesLocations(decodeCitiesData(data));

            var cityPointGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
            model.cities.forEach(p => {
                var point = new THREE.Mesh(
                    cityPointGeometry,
                    material);
                
                point.position.x = p[0] || 0.0;
                point.position.y = p[1] || 0.0;
                point.position.z = p[2] || 0.0;

                scene.add(point);
                render();
            });
        }
    );

    $.get("http://localhost:8089/data/tours/djibouti-tour-01.csv",
        {},
        function(data) {
            // data format: min;max;[1,2,...,n]
            let tours = decodeTourData(data);
            console.log(tours);
        }
    );
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

        coord = coord.map(v => parseInt(v));

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
    var dM = Math.max(xstats.delta, ystats.delta, zstats.delta);

    cities.map(p => {
        p[0] -= center[0];
        p[1] -= center[1];
        p[2] -= center[2];

        p[0] /= dM;
        p[1] /= dM;
        p[2] /= dM;

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
        let tour = JSON.parse(tokens[2]);
        tours.push(tour);
    });

    return tours;
}
