// Cosmic Horizon Economy Formal Specification
// Models trading, credits, energy systems and verifies safety invariants
module cosmicEconomy {
  type Commodity = Cyrillium | Food | Tech

  pure val MAX_ENERGY = 500
  pure val STARTING_CREDITS = 10000
  pure val BASE_PRICES: Commodity -> int = Map(Cyrillium -> 50, Food -> 25, Tech -> 100)
  pure val OUTPOST_CAPACITY = 1000
  pure val COMMODITIES = Set(Cyrillium, Food, Tech)

  var playerCredits: int
  var playerEnergy: int
  var playerCargo: Commodity -> int
  var outpostStock: Commodity -> int
  var outpostTreasury: int

  pure def calculatePrice(commodity: Commodity, stock: int, capacity: int): int = {
    val basePrice = BASE_PRICES.get(commodity)
    val numerator = 200 * capacity - 150 * stock
    val rawPrice = basePrice * numerator / (100 * capacity)
    if (rawPrice < 1) 1 else rawPrice
  }

  pure def min(a: int, b: int): int = if (a < b) a else b

  action init = all {
    playerCredits' = STARTING_CREDITS,
    playerEnergy' = MAX_ENERGY,
    playerCargo' = COMMODITIES.mapBy(_ => 0),
    outpostStock' = COMMODITIES.mapBy(_ => 500),
    outpostTreasury' = 50000,
  }

  // Player buys commodity from outpost (outpost sells)
  action playerBuys(commodity: Commodity, qty: int): bool = {
    val stock = outpostStock.get(commodity)
    val availableQty = min(qty, stock)
    val price = calculatePrice(commodity, stock, OUTPOST_CAPACITY)
    val totalCost = price * availableQty
    all {
      qty > 0,
      availableQty > 0,
      playerCredits >= totalCost,
      playerCredits' = playerCredits - totalCost,
      playerCargo' = playerCargo.set(commodity, playerCargo.get(commodity) + availableQty),
      outpostStock' = outpostStock.set(commodity, stock - availableQty),
      outpostTreasury' = outpostTreasury + totalCost,
      playerEnergy' = playerEnergy,
    }
  }

  // Player sells commodity to outpost (outpost buys)
  action playerSells(commodity: Commodity, qty: int): bool = {
    val held = playerCargo.get(commodity)
    val stock = outpostStock.get(commodity)
    val space = OUTPOST_CAPACITY - stock
    val price = calculatePrice(commodity, stock, OUTPOST_CAPACITY)
    val maxAffordable = outpostTreasury / price
    val finalQty = min(min(min(qty, held), space), maxAffordable)
    val totalCost = price * finalQty
    all {
      qty > 0,
      finalQty > 0,
      playerCredits' = playerCredits + totalCost,
      playerCargo' = playerCargo.set(commodity, held - finalQty),
      outpostStock' = outpostStock.set(commodity, stock + finalQty),
      outpostTreasury' = outpostTreasury - totalCost,
      playerEnergy' = playerEnergy,
    }
  }

  // Spend energy (warping, scanning, etc.)
  action spendEnergy(cost: int): bool = all {
    cost > 0,
    playerEnergy >= cost,
    playerEnergy' = playerEnergy - cost,
    playerCredits' = playerCredits,
    playerCargo' = playerCargo,
    outpostStock' = outpostStock,
    outpostTreasury' = outpostTreasury,
  }

  // Energy regeneration tick
  action regenEnergy: bool = all {
    playerEnergy < MAX_ENERGY,
    playerEnergy' = if (playerEnergy + 1 > MAX_ENERGY) MAX_ENERGY else playerEnergy + 1,
    playerCredits' = playerCredits,
    playerCargo' = playerCargo,
    outpostStock' = outpostStock,
    outpostTreasury' = outpostTreasury,
  }

  // Nondeterministic step: any possible action
  action step = any {
    nondet c = COMMODITIES.oneOf()
    nondet q = 1.to(50).oneOf()
    playerBuys(c, q),

    nondet c = COMMODITIES.oneOf()
    nondet q = 1.to(50).oneOf()
    playerSells(c, q),

    nondet cost = 1.to(20).oneOf()
    spendEnergy(cost),

    regenEnergy,
  }

  // === Safety Invariants ===
  val creditsNonNegative = playerCredits >= 0
  val energyInBounds = playerEnergy >= 0 and playerEnergy <= MAX_ENERGY
  val stockInBounds = COMMODITIES.forall(c =>
    outpostStock.get(c) >= 0 and outpostStock.get(c) <= OUTPOST_CAPACITY
  )
  val treasuryNonNegative = outpostTreasury >= 0
  val cargoNonNegative = COMMODITIES.forall(c => playerCargo.get(c) >= 0)

  // Money conservation: credits + treasury is constant across pure trades
  val moneyConserved = playerCredits + outpostTreasury == STARTING_CREDITS + 50000

  // Combined safety
  val safetyInvariant = and {
    creditsNonNegative,
    energyInBounds,
    stockInBounds,
    treasuryNonNegative,
    cargoNonNegative,
  }

  // === Tests ===
  run buyTest = {
    init
      .then(playerBuys(Cyrillium, 10))
      .then(all {
        assert(playerCredits < STARTING_CREDITS),
        assert(playerCargo.get(Cyrillium) == 10),
        assert(outpostStock.get(Cyrillium) == 490),
        playerCredits' = playerCredits,
        playerEnergy' = playerEnergy,
        playerCargo' = playerCargo,
        outpostStock' = outpostStock,
        outpostTreasury' = outpostTreasury,
      })
  }

  run sellTest = {
    init
      .then(playerBuys(Food, 20))
      .then(playerSells(Food, 10))
      .then(all {
        assert(playerCargo.get(Food) == 10),
        playerCredits' = playerCredits,
        playerEnergy' = playerEnergy,
        playerCargo' = playerCargo,
        outpostStock' = outpostStock,
        outpostTreasury' = outpostTreasury,
      })
  }

  run energyTest = {
    init
      .then(spendEnergy(100))
      .then(all {
        assert(playerEnergy == 400),
        playerCredits' = playerCredits,
        playerEnergy' = playerEnergy,
        playerCargo' = playerCargo,
        outpostStock' = outpostStock,
        outpostTreasury' = outpostTreasury,
      })
  }
}
