let currentColumn = "";
let currentTaskId = null;


function generateTaskId() {
    return 'task-' + Math.random().toString(36).substr(2, 9);
}


function showTaskForm(column) {
    currentColumn = column;
    document.getElementById("task-form-modal").style.display = "flex";
    document.getElementById("task-title").value = "";
    document.getElementById("task-date").value = "";
    currentTaskId = null;
}


function closeTaskForm() {
    document.getElementById("task-form-modal").style.display = "none";
}


function addTask() {
    const title = document.getElementById("task-title").value;
    const dueDate = document.getElementById("task-date").value;

    if (!title) {
        alert("Task title is required!");
        return;
    }

    const taskId = currentTaskId || generateTaskId();
    const taskElement = document.createElement("div");
    taskElement.classList.add("task");
    taskElement.setAttribute("draggable", "true");
    taskElement.setAttribute("data-id", taskId);
    taskElement.innerHTML = `
        <span class="task-title">${title}</span>
        <div class="date">${dueDate ? `Due: ${dueDate}` : "No due date"}</div>
        <button onclick="editTask('${taskId}')">Edit</button>
        <button onclick="deleteTask('${taskId}')">Delete</button>
        <button onclick="markComplete('${taskId}')">Mark as Complete</button>
    `;


    if (currentColumn === "todo") {
        document.getElementById("todo-tasks").appendChild(taskElement);
    } else if (currentColumn === "in-progress") {
        document.getElementById("in-progress-tasks").appendChild(taskElement);
    } else if (currentColumn === "completed") {
        document.getElementById("completed-tasks").appendChild(taskElement);
    }

    closeTaskForm();
}


function editTask(taskId) {
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    document.getElementById("task-title").value = taskElement.querySelector(".task-title").textContent;
    const dateText = taskElement.querySelector(".date").textContent;
    document.getElementById("task-date").value = dateText.includes("Due:") ? dateText.replace('Due: ', '') : '';
    currentTaskId = taskId;
    showTaskForm(currentColumn);
}


function deleteTask(taskId) {
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    taskElement.remove();
}


function markComplete(taskId) {
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    taskElement.classList.toggle("complete");
}


document.addEventListener("dragstart", function (e) {
    if (e.target.classList.contains("task")) {
        e.dataTransfer.setData("taskId", e.target.getAttribute("data-id"));
    }
});

document.addEventListener("dragover", function (e) {
    e.preventDefault();
    if (e.target.classList.contains("column")) {
        e.target.style.background = "#555";
    }
});

document.addEventListener("dragleave", function (e) {
    if (e.target.classList.contains("column")) {
        e.target.style.background = "";
    }
});

document.addEventListener("drop", function (e) {
    if (e.target.classList.contains("column")) {
        const taskId = e.dataTransfer.getData("taskId");
        const taskElement = document.querySelector(`[data-id="${taskId}"]`);
        if (taskElement) {
            e.target.appendChild(taskElement);
            e.target.style.background = "";
        }
    }
});
