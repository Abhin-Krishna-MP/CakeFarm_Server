import { categoriesModel } from "../models/categories.model.js";
import { ProductModel } from "../models/product.model.js";
import { UserModel } from "../models/user.model.js";
import { Department } from "../models/department.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { filterObject } from "../utils/helper.js";

const createCategory = asyncHandler(async (req, res) => {
  const { categoryName, categoryDesc, categoryImage } = req.body;

  if (!categoryName)
    throw new ApiError(400, "provide a category name");

  const categoryRes = await categoriesModel.createCategory(
    categoryName,
    categoryDesc,
    categoryImage || ""
  );

  if (!categoryRes) {
    throw new ApiError(500, "error creating category");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "category created successfully"));
});

const createProduct = asyncHandler(async (req, res) => {
  const productDetails = req.body;

  const newProduct = await ProductModel.createProduct(productDetails);

  if (!newProduct) {
    throw new ApiError(500, "something went wrong while creating product");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { product: newProduct },
        "product created successfully"
      )
    );
});

const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  let updateFields = req.body;
  // filter the update fields of products that are allowed to udpate
  updateFields = filterObject(updateFields, [
    "productId",
    "productName",
    "image",
    "rating",
    "description",
    "vegetarian",
    "price",
    "stock",
    "categoryId",
    "isLunchItem",
  ]);

  const updatedProduct = await ProductModel.updateProducts(
    productId,
    updateFields
  );

  if (!updatedProduct) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { updatedProduct: updatedProduct },
        "product updated successfully"
      )
    );
});

const deleteProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  const delProdResult = await ProductModel.deleteProductById(productId);
  if (!delProdResult) {
    throw new ApiError(500, "product not found or something went wrong");
  }

  // return success if product was successfully deleted
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Product deleted successfully"));
});

const deleteUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const deleteUserResult = await UserModel.deleteUserById(userId);
  if (!deleteUserResult)
    throw new ApiError(500, "user not found or something went wrong ");

  // return success if user deleted
  return res
    .status(201)
    .json(new ApiResponse(201, {}, "user deleted successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { categoryName, categoryDesc, categoryImage } = req.body;

  const updateFields = {};
  if (categoryName)  updateFields.categoryName  = categoryName;
  if (categoryDesc !== undefined) updateFields.description   = categoryDesc;
  if (categoryImage !== undefined) updateFields.categoryImage = categoryImage;

  const updated = await categoriesModel.updateCategory(categoryId, updateFields);

  if (!updated)
    throw new ApiError(404, "Category not found or update failed");

  return res
    .status(200)
    .json(new ApiResponse(200, { category: updated }, "category updated successfully"));
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const result = await categoriesModel.deleteCategory(categoryId);

  if (!result)
    throw new ApiError(404, "Category not found or could not be deleted");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "category deleted successfully"));
});

/* ──────────── Department controllers ──────────── */

const getDepartments = asyncHandler(async (_req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  return res.status(200).json(new ApiResponse(200, { departments }, "departments fetched successfully"));
});

const createDepartment = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw new ApiError(400, "Department name is required");

  const existing = await Department.findOne({ name: name.trim() });
  if (existing) throw new ApiError(409, "Department already exists");

  const dept = await Department.create({ name: name.trim() });
  return res.status(201).json(new ApiResponse(201, { department: dept }, "department created successfully"));
});

const updateDepartment = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const { name, semesters, batches } = req.body;

  const dept = await Department.findById(departmentId);
  if (!dept) throw new ApiError(404, "Department not found");

  if (name !== undefined) dept.name = name.trim();
  if (semesters !== undefined) dept.semesters = semesters;
  if (batches !== undefined) dept.batches = batches;

  await dept.save();
  return res.status(200).json(new ApiResponse(200, { department: dept }, "department updated successfully"));
});

const deleteDepartment = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const result = await Department.findByIdAndDelete(departmentId);
  if (!result) throw new ApiError(404, "Department not found");
  return res.status(200).json(new ApiResponse(200, {}, "department deleted successfully"));
});

export {
  createCategory,
  updateCategory,
  deleteCategory,
  updateProduct,
  deleteProduct,
  deleteUser,
  createProduct,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
