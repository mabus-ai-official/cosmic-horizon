import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Cantina Easter Egg achievements — "The Drifter"
  // Triggered by ordering: pirate_grog → void_stout → quantum_cocktail
  const achievements = [
    {
      id: "cantina_enabler",
      name: "Enabler",
      description:
        "You gave a rambling spacer some change. He probably spent it on more grog.",
      category: "special",
      xp_reward: 100,
      credit_reward: 0,
      hidden: true,
      icon: "$",
      sort_order: 900,
    },
    {
      id: "cantina_no_hope",
      name: "No Hope for Humanity",
      description: "A broken man asked for change. You walked away.",
      category: "special",
      xp_reward: 100,
      credit_reward: 0,
      hidden: true,
      icon: "X",
      sort_order: 901,
    },
  ];

  for (const ach of achievements) {
    const existing = await knex("achievement_definitions")
      .where({ id: ach.id })
      .first();
    if (existing) {
      await knex("achievement_definitions").where({ id: ach.id }).update(ach);
    } else {
      await knex("achievement_definitions").insert(ach);
    }
  }
}
