var camera, scene, renderer, controls;
var geometry, material, mesh;

var model = {
    cities: [],
    path: []
};
for (var i=0; i<25; ++i) {
    var rx = Math.random() - 0.5;
    var ry = Math.random() - 0.5;
    var rz = Math.random() - 0.5;
    model.cities.push([rx, ry, rz]);
}

window.addEventListener('load', function() {
    init();
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

    var cityPointGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    model.cities.forEach(p => {
        var point = new THREE.Mesh(
            cityPointGeometry,
            material);
        point.position.x = p[0];
        point.position.y = p[1];
        point.position.z = p[2];
        scene.add(point);
    });

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
