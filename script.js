// Personal Budget Planner
// Storage: localStorage

const STORAGE_KEY = "personalBudgetPlanner_v1";

const budgetMonth = document.getElementById("budgetMonth");
const budgetForm = document.getElementById("budgetForm");
const monthlyBudgetInput = document.getElementById("monthlyBudget");

const transactionForm = document.getElementById("transactionForm");
const descriptionInput = document.getElementById("description");
const typeInput = document.getElementById("type");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");

const totalIncomeElement = document.getElementById("totalIncome");
const totalExpensesElement = document.getElementById("totalExpenses");
const remainingBalanceElement = document.getElementById("remainingBalance");

const budgetPercentageElement = document.getElementById("budgetPercentage");
const budgetProgress = document.getElementById("budgetProgress");
const budgetMessage = document.getElementById("budgetMessage");

const transactionList = document.getElementById("transactionList");
const transactionCount = document.getElementById("transactionCount");
const filterType = document.getElementById("filterType");
const clearMonthButton = document.getElementById("clearMonthButton");
const formMessage = document.getElementById("formMessage");

// Current date in local calendar format.
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getCurrentMonth() {
    return getLocalDateString().slice(0, 7);
}

// Initialize application state.
function loadData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return { budgets: {}, transactions: [] };
        }

        const data = JSON.parse(savedData);

        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data) ||
            !data.budgets ||
            typeof data.budgets !== "object" ||
            Array.isArray(data.budgets) ||
            !Array.isArray(data.transactions)
        ) {
            throw new Error("Invalid saved data.");
        }

        const budgets = {};

        for (const [month, amount] of Object.entries(data.budgets)) {
            if (
                /^\d{4}-(0[1-9]|1[0-2])$/.test(month) &&
                typeof amount === "number" &&
                Number.isFinite(amount) &&
                amount >= 0 &&
                amount <= Number.MAX_SAFE_INTEGER
            ) {
                budgets[month] = amount;
            }
        }

        const transactions = data.transactions
            .filter((item) =>
                item &&
                typeof item.id === "string" &&
                typeof item.description === "string" &&
                ["income", "expense"].includes(item.type) &&
                typeof item.amount === "number" &&
                Number.isFinite(item.amount) &&
                item.amount > 0 &&
                item.amount <= Number.MAX_SAFE_INTEGER &&
                typeof item.category === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
                Number.isFinite(Date.parse(item.date + "T00:00:00Z"))
            )
            .map((item) => ({
                id: item.id,
                description: item.description.slice(0, 100),
                type: item.type,
                amount: item.amount,
                category: item.category.slice(0, 50),
                date: item.date
            }));

        return { budgets, transactions };
    } catch (error) {
        console.error("Could not load saved budget data:", error);

        return { budgets: {}, transactions: [] };
    }
}

let appData = loadData();

// Save application state.
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        return true;
    } catch (error) {
        console.error("Could not save budget data:", error);
        return false;
    }
}

// Format amounts in Indian Rupees.
function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Get the selected month.
function getSelectedMonth() {
    return budgetMonth.value;
}

// Return transactions belonging to the selected month.
function getMonthlyTransactions() {
    const month = getSelectedMonth();

    return appData.transactions.filter((transaction) =>
        transaction.date.startsWith(month)
    );
}

// Show a message under the transaction form.
function showFormMessage(message, type = "") {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
}

// Update summary cards and budget progress.
function updateDashboard() {
    const transactions = getMonthlyTransactions();

    const income = transactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

    const expenses = transactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    const remaining = income - expenses;
    const budget = appData.budgets[getSelectedMonth()] ?? 0;

    totalIncomeElement.textContent = formatCurrency(income);
    totalExpensesElement.textContent = formatCurrency(expenses);
    remainingBalanceElement.textContent = formatCurrency(remaining);

    remainingBalanceElement.style.color =
        remaining < 0 ? "var(--danger)" : "var(--primary)";

    let percentage = 0;

    if (budget > 0) {
        percentage = (expenses / budget) * 100;
    }

    const displayedPercentage = Math.round(percentage);

    budgetPercentageElement.textContent = `${displayedPercentage}%`;
    budgetProgress.style.width = `${Math.min(percentage, 100)}%`;

    budgetProgress.classList.toggle("over-budget", percentage > 100);

    if (budget === 0) {
        budgetMessage.textContent =
            "Set a monthly budget to track your spending.";
    } else if (expenses > budget) {
        budgetMessage.textContent =
            `You have exceeded your budget by ${formatCurrency(expenses - budget)}.`;
    } else {
        budgetMessage.textContent =
            `${formatCurrency(budget - expenses)} remaining in your monthly spending budget.`;
    }
}

// Create an element safely without inserting user text as HTML.
function createElement(tag, className, text = "") {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = text;

    return element;
}

// Render transaction history.
function renderTransactions() {
    transactionList.replaceChildren();

    const selectedType = filterType.value;

    const transactions = getMonthlyTransactions()
        .filter((item) =>
            selectedType === "all" || item.type === selectedType
        )
        .sort((a, b) =>
            b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
        );

    transactionCount.textContent =
        `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;

    if (transactions.length === 0) {
        const emptyState = createElement("div", "empty-state");
        emptyState.append(
            createElement("span", "", "🧾"),
            createElement("p", "", "No transactions found."),
            createElement(
                "small",
                "",
                "Add a transaction or change the selected filter."
            )
        );

        transactionList.appendChild(emptyState);
        return;
    }

    // Limit rendering to keep the interface responsive.
    transactions.slice(0, 500).forEach((transaction) => {
        const item = createElement("div", "transaction-item");

        const icon = createElement(
            "div",
            "transaction-icon",
            transaction.type === "income" ? "💵" : "🛒"
        );

        const details = createElement("div", "transaction-details");

        details.append(
            createElement("h3", "", transaction.description),
            createElement(
                "p",
                "",
                `${transaction.category} · ${transaction.date}`
            )
        );

        const right = createElement("div", "transaction-right");

        const amount = createElement(
            "div",
            `transaction-amount ${transaction.type}`,
            `${transaction.type === "income" ? "+" : "−"}${formatCurrency(transaction.amount)}`
        );

        const deleteButton = createElement(
            "button",
            "delete-button",
            "Delete"
        );

        deleteButton.type = "button";
        deleteButton.setAttribute(
            "aria-label",
            `Delete transaction: ${transaction.description}`
        );

        deleteButton.addEventListener("click", () => {
            deleteTransaction(transaction.id);
        });

        right.append(amount, deleteButton);
        item.append(icon, details, right);
        transactionList.appendChild(item);
    });

    if (transactions.length > 500) {
        transactionList.appendChild(
            createElement(
                "p",
                "budget-message",
                "Showing the latest 500 matching transactions."
            )
        );
    }
}

// Save monthly budget.
budgetForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const rawValue = monthlyBudgetInput.value.trim();
    const budget = Number(rawValue);

    if (
        rawValue === "" ||
        !Number.isFinite(budget) ||
        budget < 0 ||
        budget > Number.MAX_SAFE_INTEGER
    ) {
        alert("Please enter a valid, non-negative budget amount.");
        return;
    }

    const month = getSelectedMonth();

    if (!month) {
        alert("Please select a budget month.");
        return;
    }

    const previousBudget = appData.budgets[month];

    appData.budgets[month] = budget;

    if (!saveData()) {
        if (previousBudget === undefined) {
            delete appData.budgets[month];
        } else {
            appData.budgets[month] = previousBudget;
        }

        alert("Unable to save your budget. Please check browser storage.");
        return;
    }

    updateDashboard();
    alert("Monthly budget saved successfully!");
});

// Add income or expense.
transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const type = typeInput.value;
    const amountText = amountInput.value.trim();
    const amount = Number(amountText);
    const category = categoryInput.value;
    const date = dateInput.value;

    if (!description) {
        showFormMessage("Please enter a transaction description.", "error");
        return;
    }

    if (
        !["income", "expense"].includes(type) ||
        amountText === "" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > Number.MAX_SAFE_INTEGER
    ) {
        showFormMessage("Enter a valid amount greater than zero.", "error");
        return;
    }

    if (!date || !Number.isFinite(Date.parse(date + "T00:00:00Z"))) {
        showFormMessage("Please select a valid transaction date.", "error");
        return;
    }

    if (date.slice(0, 7) !== getSelectedMonth()) {
        showFormMessage(
            "The transaction date must belong to the selected budget month.",
            "error"
        );
        return;
    }

    const transaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        description,
        type,
        amount,
        category,
        date
    };

    appData.transactions.push(transaction);

    if (!saveData()) {
        appData.transactions.pop();

        showFormMessage(
            "Could not save transaction. Check your browser storage.",
            "error"
        );
        return;
    }

    transactionForm.reset();

    dateInput.value = getLocalDateString();
    typeInput.value = "income";
    categoryInput.value = "Salary";

    showFormMessage("Transaction added successfully!", "success");

    updateDashboard();
    renderTransactions();
});

// Delete a transaction.
function deleteTransaction(id) {
    const index = appData.transactions.findIndex(
        (transaction) => transaction.id === id
    );

    if (index === -1) {
        return;
    }

    const deletedTransaction = appData.transactions[index];

    if (!confirm(`Delete "${deletedTransaction.description}"?`)) {
        return;
    }

    appData.transactions.splice(index, 1);

    if (!saveData()) {
        appData.transactions.splice(index, 0, deletedTransaction);

        alert("Unable to delete the transaction. Please try again.");
        return;
    }

    updateDashboard();
    renderTransactions();
}

// Change month and display its saved budget and transactions.
budgetMonth.addEventListener("change", () => {
    const month = getSelectedMonth();

    if (!month) {
        budgetMonth.value = getCurrentMonth();
        return;
    }

    monthlyBudgetInput.value = appData.budgets[month] ?? "";
    dateInput.value = `${month}-${String(new Date().getDate()).padStart(2, "0")}`;

    // Correct the day for months with fewer days.
    const selectedDate = new Date();
    const [year, monthNumber] = month.split("-").map(Number);
    const day = Math.min(
        selectedDate.getDate(),
        new Date(year, monthNumber, 0).getDate()
    );

    dateInput.value =
        `${month}-${String(day).padStart(2, "0")}`;

    showFormMessage("");
    updateDashboard();
    renderTransactions();
});

// Filter transactions.
filterType.addEventListener("change", renderTransactions);

// Clear all transactions for the selected month.
clearMonthButton.addEventListener("click", () => {
    const month = getSelectedMonth();

    const monthlyTransactions = appData.transactions.filter(
        (transaction) => transaction.date.startsWith(month)
    );

    if (monthlyTransactions.length === 0) {
        alert("There are no transactions to clear for this month.");
        return;
    }

    if (!confirm(`Delete all ${monthlyTransactions.length} transactions for ${month}? The monthly budget will be kept.`)) {
        return;
    }

    const previousTransactions = appData.transactions;

    appData.transactions = previousTransactions.filter(
        (transaction) => !transaction.date.startsWith(month)
    );

    if (!saveData()) {
        appData.transactions = previousTransactions;

        alert("Unable to clear transactions. Please try again.");
        return;
    }

    updateDashboard();
    renderTransactions();

    showFormMessage("Monthly transactions cleared.", "success");
});

// Initialize the application.
function initializeApp() {
    const month = getCurrentMonth();

    budgetMonth.value = month;
    monthlyBudgetInput.value = appData.budgets[month] ?? "";
    dateInput.value = getLocalDateString();

    updateDashboard();
    renderTransactions();
}

initializeApp();