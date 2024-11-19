document.addEventListener("DOMContentLoaded", async () => {
  // Configuration
  const SUPABASE_URL = "https://your-supabase-url.supabase.co";
  const SUPABASE_ANON_KEY = "your-supabase-anon-key";
  const OPENAI_API_KEY = "your-openai-api-key";
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Auth Integration using Clerk
  Clerk.load();
  let currentUser = null;

  Clerk.onReady(async () => {
    const user = await Clerk.user;
    currentUser = user;
    if (!currentUser) {
      window.location.href = "/sign-in"; // Redirect if not authenticated
    } else {
      document.querySelector("#user-name").textContent = `Welcome, ${user.firstName}!`;
      loadBoardState();
    }
  });

  // Selectors
  const board = document.querySelector(".board");
  const modal = document.querySelector(".modal");
  const taskForm = document.querySelector("#task-form");
  const cancelModalBtn = document.querySelector("#cancel-modal-btn");
  const suggestTaskBtn = document.querySelector("#suggest-task-btn");

  // Helper Functions
  function showLoader(isLoading, element) {
    element.disabled = isLoading;
    element.textContent = isLoading ? "Loading..." : element.dataset.originalText || "Submit";
  }

  function createTask(title, dueDate) {
    const task = document.createElement("div");
    task.className = "task";
    task.innerHTML = `
      <div>
        <h3>${title}</h3>
        <p>Due: ${dueDate}</p>
      </div>
      <button class="delete-btn">×</button>
    `;
    task.setAttribute("draggable", true);
    return task;
  }

  function updateTaskCount(column) {
    const count = column.querySelectorAll(".task").length;
    column.querySelector(".task-count").textContent = count;
  }

  async function saveBoardState() {
    const boardState = {};
    document.querySelectorAll(".column").forEach((column) => {
      const columnId = column.id;
      const tasks = Array.from(column.querySelectorAll(".task")).map((task) => ({
        title: task.querySelector("h3").textContent,
        dueDate: task.querySelector("p").textContent.replace("Due: ", ""),
      }));
      boardState[columnId] = tasks;
    });
    await supabase.from("kanban").upsert({
      user_id: currentUser.id,
      board_state: boardState,
    });
  }

  async function loadBoardState() {
    const { data, error } = await supabase.from("kanban").select("board_state").eq("user_id", currentUser.id).single();
    if (error) {
      console.error("Error loading board:", error.message);
      return;
    }
    const boardState = data?.board_state || {};
    Object.keys(boardState).forEach((columnId) => {
      const column = document.getElementById(columnId);
      const tasksContainer = column.querySelector(".tasks");
      boardState[columnId].forEach(({ title, dueDate }) => {
        const task = createTask(title, dueDate);
        tasksContainer.appendChild(task);
      });
      updateTaskCount(column);
    });
    enableDragAndDrop();
  }

  async function getTaskSuggestions() {
    try {
      showLoader(true, suggestTaskBtn);
      const response = await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-davinci-003",
          prompt: "Suggest 3 simple tasks for a team to accomplish today.",
          max_tokens: 100,
        }),
      });
      const data = await response.json();
      const suggestions = data.choices[0]?.text.trim().split("\n").map((s) => s.trim());
      suggestions.forEach((suggestion) => {
        const task = createTask(suggestion, "No due date");
        document.querySelector("#draft .tasks").appendChild(task);
      });
      updateTaskCount(document.querySelector("#draft"));
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
    } finally {
      showLoader(false, suggestTaskBtn);
    }
  }

  // Event Listeners
  board.addEventListener("click", (e) => {
    if (e.target.closest(".add-task-btn")) {
      modal.classList.add("active");
      modal.dataset.column = e.target.closest(".column").id;
    }
  });

  cancelModalBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.querySelector("#task-title").value;
    const dueDate = document.querySelector("#task-due-date").value;
    const columnId = modal.dataset.column;

    const task = createTask(title, dueDate);
    document.querySelector(`#${columnId} .tasks`).appendChild(task);
    modal.classList.remove("active");
    taskForm.reset();
    updateTaskCount(document.getElementById(columnId));
    await saveBoardState();
    enableDragAndDrop();
  });

  board.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn")) {
      const task = e.target.closest(".task");
      const column = task.closest(".column");
      task.remove();
      updateTaskCount(column);
      saveBoardState();
    }
  });

  suggestTaskBtn.addEventListener("click", getTaskSuggestions);

  // Drag-and-Drop
  function enableDragAndDrop() {
    const tasks = document.querySelectorAll(".task");
    const columns = document.querySelectorAll(".tasks");

    tasks.forEach((task) => {
      task.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", task.outerHTML);
        task.classList.add("dragging");
      });

      task.addEventListener("dragend", () => {
        task.classList.remove("dragging");
      });
    });

    columns.forEach((column) => {
      column.addEventListener("dragover", (e) => {
        e.preventDefault();
        const draggingTask = document.querySelector(".dragging");
        column.appendChild(draggingTask);
      });

      column.addEventListener("drop", async (e) => {
        e.preventDefault();
        const draggingTask = document.querySelector(".dragging");
        if (draggingTask) {
          column.appendChild(draggingTask);
        }
        await saveBoardState();
        enableDragAndDrop();
      });
    });
  }

  // Initialize
  loadBoardState();
});