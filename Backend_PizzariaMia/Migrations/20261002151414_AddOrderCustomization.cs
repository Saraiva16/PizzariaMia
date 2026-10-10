using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PizzariaMia.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderCustomization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Crust",
                table: "OrderItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Ingredients",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    AdditionalPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PizzaId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ingredients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Ingredients_Pizzas_PizzaId",
                        column: x => x.PizzaId,
                        principalTable: "Pizzas",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OrderItemAddedIngredients",
                columns: table => new
                {
                    AddedIngredientsId = table.Column<int>(type: "integer", nullable: false),
                    OrderItemId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItemAddedIngredients", x => new { x.AddedIngredientsId, x.OrderItemId });
                    table.ForeignKey(
                        name: "FK_OrderItemAddedIngredients_Ingredients_AddedIngredientsId",
                        column: x => x.AddedIngredientsId,
                        principalTable: "Ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderItemAddedIngredients_OrderItems_OrderItemId",
                        column: x => x.OrderItemId,
                        principalTable: "OrderItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderItemRemovedIngredients",
                columns: table => new
                {
                    OrderItem1Id = table.Column<int>(type: "integer", nullable: false),
                    RemovedIngredientsId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItemRemovedIngredients", x => new { x.OrderItem1Id, x.RemovedIngredientsId });
                    table.ForeignKey(
                        name: "FK_OrderItemRemovedIngredients_Ingredients_RemovedIngredientsId",
                        column: x => x.RemovedIngredientsId,
                        principalTable: "Ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderItemRemovedIngredients_OrderItems_OrderItem1Id",
                        column: x => x.OrderItem1Id,
                        principalTable: "OrderItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Ingredients_PizzaId",
                table: "Ingredients",
                column: "PizzaId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItemAddedIngredients_OrderItemId",
                table: "OrderItemAddedIngredients",
                column: "OrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItemRemovedIngredients_RemovedIngredientsId",
                table: "OrderItemRemovedIngredients",
                column: "RemovedIngredientsId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderItemAddedIngredients");

            migrationBuilder.DropTable(
                name: "OrderItemRemovedIngredients");

            migrationBuilder.DropTable(
                name: "Ingredients");

            migrationBuilder.DropColumn(
                name: "Crust",
                table: "OrderItems");
        }
    }
}
