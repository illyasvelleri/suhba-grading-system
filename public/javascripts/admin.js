document.addEventListener("DOMContentLoaded", function () {
    const btns = document.querySelectorAll(".section-btn");

    btns.forEach((btn) => {
        btn.addEventListener("click", function () {
            const sectionId = this.dataset.id;
            window.location.href = `/admin/section/${sectionId}`;
        });
    });
});

//JS to Show Table Ctreation Input Dynamically 
// document.addEventListener("DOMContentLoaded", () => {
//     const columnCount = document.getElementById("columnCount");
//     const columnNames = document.getElementById("columnNames");

//     columnCount.addEventListener("input", function () {
//         columnNames.innerHTML = "";
//         let count = parseInt(this.value);
//         for (let i = 0; i < count; i++) {
//             columnNames.innerHTML += `
//                 <label class="form-label">Column ${i + 1} Name</label>
//                 <input type="text" name="columns[]" class="form-control mb-2" required>
//             `;
//         }
//     });
// });

