// Inicializar el mapa
const map = new maplibregl.Map({
    container: 'map', // Id del contenedor en tu HTML
    style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=0SnBvUuoJRBy5F6INdTN', // URL de estilo de MapLibre
    center: [-0.376488, 39.477814], 
    zoom: 12,
  });
  
  map.on('load', async () => {
    // Cargar el archivo GeoJSON
    const geojsonData = await fetch('carreteras.geojson')
      .then(response => response.json());
  
    // Hacer una única llamada para obtener todos los colores de las calles
    const colorsResponse = await fetch('http://localhost:3000/get-all-street-colors');
    const colorsData = await colorsResponse.json();
  
    // Iterar sobre las características del GeoJSON y asignar el color de la base de datos
    geojsonData.features.forEach(feature => {
      const streetId = feature.properties.id_tramo;  // Asegúrate de que cada característica tenga un ID único
      // Asignar el color basado en los datos obtenidos
      if(colorsData[streetId] != undefined){

        feature.properties.transitable = colorsData[streetId].TRANSITABLE || null;
        feature.properties.color = getColor(colorsData[streetId].TRANSITABLE, colorsData[streetId].COCHES, colorsData[streetId].ESCOMBROS) || null;
        feature.properties.comentario = colorsData[streetId].COMENTARIO || null;
        feature.properties.coches = colorsData[streetId].COCHES; 
        feature.properties.escombros = colorsData[streetId].ESCOMBROS; 
        feature.properties.id = colorsData[streetId].ID || null; 
      }
    });

    map.addSource('streets', {
        type: 'geojson',
        data: geojsonData,
      });
    
      // Añadir la capa de las calles
      map.addLayer({
        id: 'streets-layer',
        type: 'line',
        source: 'streets',
        paint: {
          'line-color': [
      'case',
      ['!=', ['get', 'color'], null],  // Si la propiedad 'color' no es null
      ['get', 'color'],  // Aplica el color de la propiedad 'color'
      'rgba(255, 255, 255, 0 )' // Si no tiene color, no dibujes la línea (transparente)
    ],
          'line-width': 15
        },
      });
    });
    
    


    function createPopupContentView(streetInfo, photoUrls) {
      return `
        <div class="popup-tabs">
          <!-- Botones de las pestañas -->
          <div class="tab-buttons">
            <button class="tab-button active" onclick="openTab(event, 'info')">Información</button>
            <button class="tab-button" onclick="openTab(event, 'photos')">Fotos</button>
          </div>
    
          <!-- Contenido de la pestaña Información -->
          <div id="info" class="tab-content active">
            <h4>Información de la Calle</h4>
            <p><strong>Nombre:</strong> ${streetInfo.nombre}</p>
            <p><strong>Comentario:</strong> ${streetInfo.comentario}</p>
            <p><strong>Hay escombros?:</strong> ${streetInfo.escombros?"SI":"NO"}</p>
            <p><strong>Hay coches?:</strong> ${streetInfo.coches?"SI":"NO"}</p>
          </div>
    
          <!-- Contenido de la pestaña Fotos -->
          <div id="photos" class="tab-content">
            <h4>Fotos</h4>
            <input type="file" id="photoUpload" onchange="uploadPhoto('${streetInfo.id_tramo}')">
            <div class="photo-gallery">
              ${photoUrls.map(url => `<img src="/server/${url}" class="gallery-photo">`).join('')}
            </div>
          </div>
        </div>
      `;
    }

    function createPopupContentUpdate(streetInfo, photoUrls) {
      return `
        <div class="popup-tabs">
          <!-- Botones de las pestañas -->
          <div class="tab-buttons">
            <button class="tab-button active" onclick="openTab(event, 'info')">Información</button>
            <button class="tab-button" onclick="openTab(event, 'photos')">Fotos</button>
          </div>
    
          <!-- Contenido de la pestaña Información -->
          <div id="info" class="tab-content active">
            <h6>${streetInfo.nombre}</h6>
            
            <input type="hidden" value="${streetInfo.nombre}" id="name">
            <label for="comentario">Comentario:</label><br/>
            <textarea id="comentario">${streetInfo.comentario != undefined? streetInfo.comentario : ""}</textarea>
            
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="" id="transitable"  ${streetInfo.transitable == 1? "checked" : ""} >
              <label class="form-check-label" for="transitable">
                ¿Transitable?
              </label>
            </div>
            
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="" id="escombros"  ${streetInfo.transitable == 1? "checked" : ""} >
              <label class="form-check-label" for="escombros">
                ¿Hay escombros?
              </label>
            </div>
            
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="" id="coches" ${streetInfo.coches == 1? "checked" : ""} >
              <label class="form-check-label" for="coches">
                ¿Hay vehiculos?
              </label>
            </div>
            
            
            <button onclick="updateStreetInfo(${streetInfo.id})">Actualizar</button>
          </div>
    
          <!-- Contenido de la pestaña Fotos -->
          <div id="photos" class="tab-content">
            <h4>Fotos</h4>
            <input type="file" id="photoUpload" onchange="uploadPhoto('${streetInfo.id_tramo}')">
            <div class="photo-gallery">
              ${photoUrls.map(url => `<img src="/server/${url}" class="gallery-photo">`).join('')}
            </div>
          </div>
        </div>
      `;
    }
    
    function updateStreetInfo(streetId) {
      // Obtener los valores de los campos editables
      const nombre = document.getElementById('name').value;
      const comentario = document.getElementById('comentario').value;
      const escombros = document.getElementById('escombros').checked;
      const coches = document.getElementById('coches').checked;
      const transitable = document.getElementById('transitable').checked;
    
      // Crear el objeto con la información actualizada
      const updatedData = {
        nombre: nombre,
        comentario: comentario,
        escombros: escombros,
        coches: coches,
        transitable: transitable
      };
    
      // Enviar los datos al servidor mediante un endpoint
      fetch(`http://localhost:3000/update-street/${streetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      })
      .then(response => response.json())
      .then(data => {
        
        const insertedRow = data.row;
        updateStreetColorInMap(insertedRow);
        map.getContainer().querySelectorAll('.maplibregl-popup').forEach(popup => {
          popup.remove();
        });
      })
      .catch(error => {
        console.error('Error al actualizar la información:', error);
        alert('Hubo un problema al actualizar la información');
      });
    }
    
    // Función para abrir una pestaña en el popup
    function openTab(event, tabName) {
      const tabContents = document.querySelectorAll(".tab-content");
      const tabButtons = document.querySelectorAll(".tab-button");
    
      // Oculta todas las pestañas y quita la clase "active" de todos los botones
      tabContents.forEach(content => content.classList.remove("active"));
      tabButtons.forEach(button => button.classList.remove("active"));
    
      // Muestra la pestaña seleccionada y marca el botón como activo
      document.getElementById(tabName).classList.add("active");
      event.currentTarget.classList.add("active");
    }



  map.on('click', 'streets-layer', async (e) => {
    if (e.features && e.features.length > 0 && e.features[0].properties.id) {
      const streetInfo = {
        id_tramo: e.features[0].properties.id_tramo,
        id: e.features[0].properties.id,
        nombre: e.features[0].properties.nombre,
        comentario: e.features[0].properties.comentario,
        transitable: e.features[0].properties.transitable,
        coches: e.features[0].properties.coches,
        escombros: e.features[0].properties.escombros
      };

      
  
      try {
        // Llamada para obtener las fotos de la calle
        const response = await fetch(`http://localhost:3000/photos/${streetInfo.id_tramo}`);
        const photoUrls = await response.json();
    
        // Crear y mostrar el popup
        //SI PERMISOS DE EDITAR
        if(true){

          const popup = new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(createPopupContentUpdate(streetInfo, photoUrls))
          .addTo(map);
        } else {
          new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(createPopupContentView(streetInfo, photoUrls))
          .addTo(map);
        }
      } catch (error) {
        console.error('Error al cargar fotos:', error);
      }
    } else if (e.features && e.features.length > 0){
      const streetName = e.features[0].properties.nombre || 'Calle sin nombre';
      const streetId = e.features[0].properties.id_tramo;

      // Mostrar el popup con el formulario
      const popup = new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <h4>${streetName}</h4>
          <form id="popup-form">
            <input type="hidden" value="${streetName}" id="name">
            
            <label for="comentario">Comentario:</label><br/>
            <textarea id="comentario"></textarea>
            
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="" id="transitable" >
              <label class="form-check-label" for="transitable">
                ¿Transitable?
              </label>
            </div>
            
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="" id="escombros"  >
              <label class="form-check-label" for="escombros">
                ¿Hay escombros?
              </label>
            </div>
            
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="" id="coches">
              <label class="form-check-label" for="coches">
                ¿Hay vehiculos?
              </label>
            </div>
            
            <button type="submit">Guardar</button>
          </form>
        `)
        .addTo(map);



        document.getElementById('popup-form').onsubmit = async function(event) {
          event.preventDefault();
          
          const nombre = document.getElementById('name').value;
          const comentario = document.getElementById('comentario').value;
          const escombros = document.getElementById('escombros').checked;
          const coches = document.getElementById('coches').checked;
          const transitable = document.getElementById('transitable').checked;
          // Enviar los datos al servidor
          const response = await fetch(`http://localhost:3000/post-street/${streetId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              nombre: nombre,
              comentario: comentario,
              transitable: transitable,
              coches: coches,
              escombros: escombros
            })
          });
      
          if (response.ok) {
            const result = await response.json();
            const insertedRow = result.row;
            updateStreetColorInMap(insertedRow);
          } else {
            alert('Hubo un error al guardar los datos');
          }
      
          popup.remove();
        };


    }

    
  });


  
  function updateStreetColorInMap(row) {
    // Asumimos que 'streetsLayer' es la capa de MapLibre que contiene las calles
    const source = map.getSource('streets'); 
  
    // Obtener el GeoJSON de la fuente
    const geojsonData = source._data;
  
    // Buscar la calle específica por su ID
    const streetFeature = geojsonData.features.find(feature => feature.properties.id_tramo === row.ID_TRAMO);
    geojsonData.features.forEach(feature => {
    if(feature.properties.id_tramo == row[0].ID_TRAMO){
      feature.properties.transitable = row[0].TRANSITABLE || null;
      feature.properties.color = getColor(row[0].TRANSITABLE, row[0].COCHES, row[0].ESCOMBROS) || null;
      feature.properties.comentario = row[0].COMENTARIO || null;
      feature.properties.coches = row[0].COCHES; 
      feature.properties.escombros = row[0].ESCOMBROS; 
      feature.properties.id = row[0].ID || null; 
      // Actualizar la fuente de datos del mapa con el nuevo GeoJSON
      source.setData(geojsonData);
    }
    
    })
  }


function getColor(transitable, coches, escombros){
  if(transitable == 1 && coches == 0 && escombros == 0){
    return "rgba(61, 216, 114, 0.7)";
  } else if(transitable == 0){
    return "rgba(216, 61, 86, 0.7)";
  } else {
    return "rgba(216, 191, 61, 0.7)";
  }
}
  function uploadPhoto(streetId) {
    const input = document.getElementById('photoUpload');
    const formData = new FormData();
    formData.append('photo', input.files[0]);
  
    fetch(`http://localhost:3000/upload-photo/${streetId}`, {
      method: 'POST',
      body: formData,
    })
    .then(response => response.json())
    .catch(error => console.error('Error al subir la foto:', error));
  }
  // Cambia el cursor a "pointer" cuando pase sobre una calle
  map.on('mouseenter', 'streets-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  // Cambia el cursor a "default" cuando salga de una calle
  map.on('mouseleave', 'streets-layer', () => {
    map.getCanvas().style.cursor = '';
  });
  