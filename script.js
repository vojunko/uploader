// 🔧 Firebase konfigurace – nahraď svými údaji!
const firebaseConfig = {
  apiKey: "AIzaSyCPBDwfVEseuKujAX1iqJ5-GpU9ewY5UAM",
  authDomain: "kufr-86f81.firebaseapp.com",
  projectId: "kufr-86f81",
  storageBucket: "kufr-86f81.firebasestorage.app",
  messagingSenderId: "797491172029",
  appId: "1:797491172029:web:45dba5e7bf305001171dd4",
  measurementId: "G-19C6NSG9P5"
};

const uploadBtn = document.getElementById('uploadBtn');


firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();

const fileInput = document.getElementById('file-input');
const preview = document.getElementById('preview');
const linksList = document.getElementById('linksList');

let fileToUpload = null;

const dragOverlay = document.getElementById('dragOverlay');
let dragCounter = 0;

// 📌 Načti uložené odkazy z localStorage
const saved = JSON.parse(localStorage.getItem('uploads')) || [];
saved.forEach(item => addLinkToList(item.url, item.name, item.path));

// 📎 Nahrání z clipboardu
window.addEventListener('paste', async (e) => {
  const items = e.clipboardData.items;
  for (let item of items) {
    if (item.type.startsWith("image") || item.type.startsWith("video")) {
      const blob = item.getAsFile();
      if (item.type.startsWith("video")) {
        const isValid = await checkVideoDuration(blob);
        if (!isValid) {
          alert("Videos can be a maximum of 30 seconds long!");
          return;
        }
      }
      fileToUpload = blob;
      showPreview(blob);

      // ✅ Nahrát automaticky
      upload();
      return;
    }
  }
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('dragenter', () => {
  dragCounter++;
  if (dragOverlay) dragOverlay.style.display = 'block';
});

window.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter === 0 && dragOverlay) {
    dragOverlay.style.display = 'none';
  }
});

window.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragCounter = 0;
  if (dragOverlay) dragOverlay.style.display = 'none';

  const files = Array.from(e.dataTransfer.files);
  if (!files.length) return;

  for (const file of files) {
    if (!file.type.startsWith("image") && !file.type.startsWith("video")) {
      alert(`Soubor "${file.name}" není obrázek ani video.`);
      continue;
    }

    if (file.type.startsWith("video")) {
      const isValid = await checkVideoDuration(file);
      if (!isValid) {
        alert(`Video "${file.name}" je delší než 30 sekund a nebude nahráno.`);
        continue;
      }
    }

    fileToUpload = file;
    showPreview(file); // 👁️ náhled každého souboru
    upload(); // 🚀 nahrání do Firebase
  }
});

// 📁 Nahrání z PC
fileInput.addEventListener('change', async () => {
  const files = Array.from(fileInput.files);
  if (!files.length) return;

  for (const file of files) {
    if (!file.type.startsWith("image") && !file.type.startsWith("video")) {
      alert(`Soubor "${file.name}" není obrázek ani video.`);
      continue;
    }

    if (file.type.startsWith("video")) {
      const isValid = await checkVideoDuration(file);
      if (!isValid) {
        alert(`Video "${file.name}" je delší než 30 sekund a nebude nahráno.`);
        continue;
      }
    }

    fileToUpload = file;
    showPreview(file);
    upload();
  }

  // Resetuj input, aby šlo vybrat stejné soubory znovu
  fileInput.value = "";
});

// 📤 Nahrání na Firebase
let uploadCounter = 1;

function upload() {
  if (!fileToUpload) return alert("No file to upload.");

  let ext = "dat";
  let baseName = "";

  if (fileToUpload.name) {
    const parts = fileToUpload.name.split('.');
    ext = parts.pop();
    baseName = parts.join('.');
  } else if (fileToUpload.type) {
    const mimeParts = fileToUpload.type.split('/');
    ext = mimeParts[1] || "dat";
    if (ext === "jpeg") ext = "jpg";

    const typeBase = mimeParts[0] === "image" ? "image" : mimeParts[0] === "video" ? "video" : "file";
    baseName = `${typeBase}.${uploadCounter++}`;
  } else {
    baseName = `file.${uploadCounter++}`;
  }

  const fullName = `${Date.now()}-${baseName}.${ext}`;
  const storagePath = 'uploads/' + fullName;
  const storageRef = storage.ref(storagePath);

  const uploadTask = storageRef.put(fileToUpload);

  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    uploadTask.on('state_changed', snapshot => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressBar.value = progress;
    });
  }

  uploadTask.then(snapshot => snapshot.ref.getDownloadURL())
    .then(url => {
      saveToLocal(url, baseName, storagePath);
      addLinkToList(url, baseName, storagePath);
      clearPreview();
      if (progressBar) progressBar.value = 0;
    })
    .catch(console.error);
}

// 🧠 Uložení do localStorage
function saveToLocal(url, name, path) {
  saved.push({ url, name, path });
  localStorage.setItem('uploads', JSON.stringify(saved));
}
// 🧾 Přidání odkazu do seznamu
function addLinkToList(url, name, path) {
  const card = document.createElement('div');
  card.classList.add('link-card');

  const title = document.createElement('div');
  title.classList.add('link-title');

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.textContent = name;
  link.classList.add('generated-link');

  title.appendChild(link);


  // 🖼️ Náhled podle přípony v URL
 const lowerUrl = url.toLowerCase();
if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/)) {
  const img = document.createElement('img');
  img.src = url;
  img.alt = name;
  img.style.maxHeight = "100px";
  img.style.objectFit = "cover";

  const previewLink = document.createElement('a');
  previewLink.href = url;
  previewLink.target = '_blank';
  previewLink.appendChild(img);

  card.appendChild(previewLink);
} else if (lowerUrl.match(/\.(mp4|webm|ogg)(\?|$)/)) {
  const video = document.createElement('video');
  video.src = url;
  video.controls = true;
  video.style.maxHeight = "120px";
  video.style.objectFit = "cover";

  const previewLink = document.createElement('a');
  previewLink.href = url;
  previewLink.target = '_blank';
  previewLink.appendChild(video);

  card.appendChild(previewLink);
}

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.classList.add('delete-button');
  deleteBtn.onclick = () => {
    const index = saved.findIndex(item => item.url === url);
    if (index !== -1) {
      const path = saved[index].path;
      saved.splice(index, 1);
      localStorage.setItem('uploads', JSON.stringify(saved));
      const storageRef = storage.ref();
      storageRef.child(path).delete()
        .catch(console.error);
    }
    card.remove();
  };

  card.appendChild(deleteBtn);
  linksList.appendChild(card);

  
}


// 🖼️ Náhled souboru
function showPreview(file) {
  const url = URL.createObjectURL(file);
  const wrapper = document.createElement('div');
  wrapper.style.marginBottom = '10px';

  if (file.type.startsWith("image")) {
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%';
    wrapper.appendChild(img);
  } else if (file.type.startsWith("video")) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.style.maxWidth = '100%';
    wrapper.appendChild(video);
  }

  preview.appendChild(wrapper);
}

// 🔄 Reset formuláře
function clearPreview() {
  preview.innerHTML = '';
  fileInput.value = '';
  fileToUpload = null;
}

// 🎞️ Kontrola délky videa
function checkVideoDuration(file) {
  return new Promise(resolve => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = function () {
      URL.revokeObjectURL(video.src);
      const duration = video.duration;
      resolve(duration <= 120);
    };
    video.src = URL.createObjectURL(file);
  });
}




window.upload = upload;
