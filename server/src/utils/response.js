class AppResponse {
  static ok(res, message = "Success", data) {
    return res.status(200).json({
      success: true,
      message,
      data,
    });
  }

  static created(res, message = "Created successfully", data) {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  static noContent(res) {
    return res.status(204).send();
  }
}

export default AppResponse;
